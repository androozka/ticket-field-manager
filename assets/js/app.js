const client = ZAFClient.init();
let settings, currentUser, hiddenFields, readOnlyFields;

$(() => client.on('app.registered', runApp()));

/**
 * Runs app once registered
 */
async function runApp() {
  try {
    // Load required information
    ({ settings } = await client.metadata());
    ({ currentUser } = await client.get('currentUser'));
    await client.invoke('hide');

    // Assemble list of fields
    hiddenFields = fields('hidden_fields');
    readOnlyFields = fields('readonly_fields');

    // Ensure handler is called at least once
    onFieldChanged();

    // Activate event listeners
    await client.on('*.changed', onFieldChanged);
  } catch (err) {
    console.error(err);
  }
}

/**
 * Zendesk field on change event handler to hide & disable fields
 */
function onFieldChanged() {
  if (!currentUser) return;

  handleFields(hiddenFields(), 'hide');
  handleFields(readOnlyFields(), 'disable');
}

/**
 * Zendesk field handler (hidden & read-only)
 *
 * @param {[object]} fields - List of fields
 * @param {string} action - Action to perform
 */
function handleFields(fields, action) {
  fields.forEach(async field => await applyActionOnField(field, action));
}

/**
 * Applies action to Zendesk field (hide & disable)
 *
 * @param {string} field - Zendesk field name
 * @param {string} action - Action to perform on supplied field
 */
async function applyActionOnField(field, action) {
  try {
    const [name, value] = field.split('.');
    const { [`ticketFields:${name}`]: ticketField } = await client.get(
      `ticketFields:${name}`
    );

    if (!ticketField) return false;

    if (value && ticketField.type == 'tagger') {
      // Multi-option field (aka 'tagger' type)
      const { [`ticketFields:${name}.options`]: options } = await client.get(
        `ticketFields:${name}.options`
      );

      const idx = options.findIndex(async o => o.value == value);
      if (idx) {
        await client.invoke(`ticketFields:${name}.options.${idx}.${action}`);
      }
    } else {
      // Regular field (non-dropdown)
      await client.invoke(`ticketFields:${name}.${action}`);
    }
  } catch (err) {
    console.error(err.message);
  }
}

/**
 * Returns memoized array of fields that need to be modified
 *
 * @param {string} type - Type of field ("hidden_fields" or "readonly_fields")
 */
function fields(type) {
  return _.memoize(() =>
    currentUserIsWhitelistedFor(type) ? [] : splittedSetting(type)
  );
}

/**
 * Splits settings string into array format
 *
 * @param {string} value - Setting string to break apart
 * @param {string} splitChar - Character used to split setting string
 *
 * @returns {[string]} array of settings
 */
function splittedSetting(value, splitChar = ',') {
  return _.compact((settings[value] || '').split(splitChar));
}

/**
 * Determines is current user is whitelisted for specified type
 *
 * @param {string} type - Type of field ("hidden_fields" or "readonly_fields")
 */
function currentUserIsWhitelistedFor(type) {
  return _.some([
    currentUserIsWhitelistedByTagFor(type),
    currentUserIsWhitelistedByGroupFor(type),
    currentUserIsWhitelistedByOrganizationFor(type)
  ]);
}

/**
 * Determines is current user is whitelisted for specified type by tag
 *
 * @param {string} type - Type of field ("hidden_fields" or "readonly_fields")
 */
function currentUserIsWhitelistedByTagFor(type) {
  var tags = splittedSetting(type + '_whitelist_tags');
  return deepContains(currentUser.tags, tags);
}

/**
 * Determines is current user is whitelisted for specified type by group
 *
 * @param {string} type - Type of field ("hidden_fields" or "readonly_fields")
 */
function currentUserIsWhitelistedByGroupFor(type) {
  const group_ids = splittedSetting(type + '_whitelist_group_ids');
  const current_group_ids = _.map(currentUser.groups, g => String(g.id));

  return deepContains(current_group_ids, group_ids);
}

/**
 * Determines is current user is whitelisted for specified type by organization
 *
 * @param {string} type - Type of field ("hidden_fields" or "readonly_fields")
 */
function currentUserIsWhitelistedByOrganizationFor(type) {
  const org_ids = splittedSetting(type + '_whitelist_organization_ids');
  const current_org_ids = _.map(currentUser.organizations, o => String(o.id));

  return deepContains(current_org_ids, org_ids);
}

/**
 *
 * @param {*} list
 * @param {*} values
 */
function deepContains(list, values) {
  var flattened_contains = _.reduce(
    values,
    (memo, value) => {
      memo.push(_.includes(list, value));
      return memo;
    },
    []
  );

  return _.some(flattened_contains);
}
