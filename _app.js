(function() {
  return {
    fieldsOnError: [],
    requests: {
      fetchUser: function() {
        return {
          url: helpers.fmt(
            '/api/v2/users/%@.json?include=groups,organizations',
            this.currentUser().id()
          ),
          dataType: 'json',
          type: 'GET'
        };
      }
    },

    events: {
      'app.activated': 'onAppActivated',
      'fetchUser.done': 'onFetchUserDone',
      'ticket.save': 'onTicketSave',
      '*.changed': 'onFieldChanged'
    },

    onAppActivated: function(app) {
      this.ajax('fetchUser');
    },

    onFetchUserDone: function(data) {
      this.data = data; // data == currentUser

      this.onFieldChanged();
    },

    onTicketSave: function() {
      var fieldsOnError = this.validateRequiredFields();

      if (!_.isEmpty(fieldsOnError)) {
        return this.I18n.t('invalid_fields', {
          fields: this.fieldsLabel(fieldsOnError).join(',')
        });
      }

      return true;
    },

    onFieldChanged: function() {
      if (!this.data) return;

      _.defer(this.handleFields.bind(this));
    },

    handleFields: function() {
      this.handleHiddenFields();
      this.handleReadOnlyFields();
    },

    validateRequiredFields: function() {
      return _.filter(
        this.requiredFields(),
        function(field) {
          return !this.fieldIsValid(field);
        },
        this
      );
    },

    handleHiddenFields: function() {
      this.hiddenFields().forEach(function(field) {
        this.applyActionOnField(field, 'hide');
      }, this);
    },

    handleReadOnlyFields: function() {
      this.readOnlyFields().forEach(function(field) {
        this.applyActionOnField(field, 'disable');
      }, this);
    },

    applyActionOnField: function(field, action) {
      var splittedField = field.split('.'),
        fieldName = splittedField[0],
        optionValue = splittedField[1],
        ticketField = this.ticketFields(fieldName);

      if (!ticketField) {
        return false;
      }

      if (optionValue && ticketField.options()) {
        var option = _.find(ticketField.options(), function(opt) {
          return opt.value() == optionValue;
        });

        if (option) {
          option[action]();
        }
      } else {
        ticketField[action]();
      }
    },

    // Function gets config data
    requiredFields: _.memoize(function() {
      return this.fields('required_fields');
    }),

    // Function gets config data
    hiddenFields: _.memoize(function() {
      return this.fields('hidden_fields');
    }),

    // Function gets config data
    readOnlyFields: _.memoize(function() {
      return this.fields('readonly_fields');
    }),

    fields: function(type) {
      if (this.currentUserIsWithlistedFor(type)) return [];
      return this.splittedSetting(type);
    },

    currentUserIsWithlistedFor: function(type) {
      return _.any([
        this.currentUserIsWhitelistedByTagFor(type),
        this.currentUserIsWhitelistedByGroupFor(type),
        this.currentUserIsWhitelistedByOrganizationFor(type)
      ]);
    },

    currentUserIsWhitelistedByTagFor: function(type) {
      var tags = this.splittedSetting(type + '_whitelist_tags');

      return this.deepContains(this.data.user.tags, tags);
    },

    currentUserIsWhitelistedByGroupFor: function(type) {
      var group_ids = this.splittedSetting(type + '_whitelist_group_ids'),
        current_group_ids = _.map(this.data.groups, function(group) {
          return String(group.id);
        });

      return this.deepContains(current_group_ids, group_ids);
    },

    currentUserIsWhitelistedByOrganizationFor: function(type) {
      var organization_ids = this.splittedSetting(
          type + '_whitelist_organization_ids'
        ),
        current_organization_ids = _.map(this.data.organizations, function(
          organization
        ) {
          return String(organization.id);
        });

      return this.deepContains(current_organization_ids, organization_ids);
    },

    //list and values should be Arrays
    deepContains: function(list, values) {
      var flattened_contains = _.inject(
        values,
        function(memo, value) {
          memo.push(_.contains(list, value));
          return memo;
        },
        []
      );

      return _.any(flattened_contains);
    },

    splittedSetting: function(name) {
      return _.compact((this.setting(name) || '').split(','));
    },

    fieldIsValid: function(field) {
      var value = _.clone(this.containerContext().ticket[field]);

      // field is present and is empty
      if (
        this.ticketFields(field) &&
        (_.isEmpty(value) ||
          value == '-' ||
          (field == 'type' && value == 'ticket') ||
          (field == 'requester' && _.isEmpty(value.email)))
      ) {
        return false;
      }

      return true;
    },

    fieldsLabel: function(fields) {
      return _.map(
        fields,
        function(field) {
          var tf = this.ticketFields(field),
            label =
              this.ticketFields(field) && this.ticketFields(field).label();

          if (label) {
            return label;
          } else {
            return field;
          }
        },
        this
      );
    }
  };
})();
