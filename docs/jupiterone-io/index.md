# {{providerTitle}}

## Overview

The integration connects directly to {{providerTitle}} APIs to obtain account
metadata and analyze resource relationships. Customers authorize access by
creating API credentials in their {{providerTitle}} account and providing those
credentials when setting up an instance of the integration in JupiterOne.

## API Authentication

{{providerTitle}} provides [detailed instructions on creating an API
credentials][1].

## Entities

These entities are ingested when the integration runs:

| Example Entity Resource | \_type : \_class of the Entity        |
| ----------------------- | ------------------------------------- |
| Account                 | `example_account` : `Account`         |
| Application             | `example_application` : `Application` |

## Relationships

These relationships are created/mapped:

| From              | Type    | To                    |
| ----------------- | ------- | --------------------- |
| `example_account` | **HAS** | `example_application` |

[1]: {{providerUrl}}
