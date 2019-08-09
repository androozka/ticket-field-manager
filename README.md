# Ticket Field Manager

**_Use of this software is subject to important terms and conditions as set forth in the License file_**

## Description

A Zendesk app to hide & disable ticket fields in your agent interface. Allows for whitelisting based on tag, group, or organization. Has been rebuilt for the current v2 Zendesk framework.

(_The "required fields" feature was removed due to integration into the Zendesk platform._)

### Available Fields

- brand
- requester
- assignee
- collaborator
- sharedWith
- status
- ticket_form_id (the ticket form dropdown)
- tags
- type
- priority
- problem
- custom_field\_{id} `(Example: custom_field_1234)`

You can also hide/disable options for a given dropdown field. Here's some examples:

- status.pending
- custom_field_23049272.third_option
- assignee.21312636 (21312636 is the ID of a group)
- assignee.21312636:422450083 (21312636 is the group ID and 422450083 is the user ID)

By downloading this app, you are agreeing to our [terms and conditions](https://github.com/zendesklabs/wiki/wiki/Terms-and-Conditions)

## Screenshot(s)

- None
