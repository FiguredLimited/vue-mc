# Change Log
All notable changes to this project will be documented in this file.
This project follows [Semantic Versioning](http://semver.org/)

## [0.6.0] - 2019-08-15
- Added Indonesian locale.
- Added Polish locale.
- Added German locale.
- Added Persian locale.
- Added Arabic locale.
- Fix save events to reflect behavior described in the documentation.
- Package dependency upgrades, relaxed Vue version requirement. #121
- Lodash imported per module as needed to reduce build size.
- Export Request, Response and RequestError to enable custom Axios instances.
- Updated the demo.
- Fix double devtools message. #120
- Fix collection fetch with options override replacing pagination. #112
- Fix `validateRecursively` always returning an error with collections. #92

## [0.5.0] - 2018-11-15
- Safer request option defaults
- Added `upload` method.
- Cleaned up duplicate dependencies.
- Removed check for validation rule test returning false.
- Upgrade some package dependencies.

## [0.4.0] - 2018-10-17
- Change Model.getSaveData to always include the id if patching. @BehindTheMath
- Add params/headers to fetch, save and delete functions. @throrin19
- Fix and add more tests for Model.clone() @BehindTheMath
- Minor changes to collection filter.
- Collection clearState now sets loading to false.
- Validation now uses promises and supports async rules.

## [0.3.0] - 2018-08-13
- Model attributes are now merged with response data, rather than replaced.
- Use date-fns instead of moment.js for date validation. @Dylan-Chapman
- `fetch` now accepts options. @throrin19
- Collection now has a `toArray` method. @throrin19
- Fixed RegExp flag assignment issues on IE. (Jiri Peterek)

## [0.2.4] - 2018-02-04
- Fix a bug where reactivity is lost after `reset()` or `sync()`
- Fix getters being called during the `autobind` phase
- Rename `getPaginationQueryParameters` to `getPaginationQuery`

## [0.2.3] - 2017-11-13
- Add `getRoute` method

## [0.2.2] - 2017-11-08
- Fix `useFirstErrorOnly` not working when using vue-mc validation (not server side)

## [0.2.1] - 2017-11-03
- Add get/set to collection attributes
- Allow duplicate models to be added, but not the same instance twice

## [0.2.0] - 2017-11-02
- Import all required packages instead of relying on globals
- Fix collection not handling an empty response correctly
- Add attributes to collections
- Add `useFirstErrorOnly` option to `Model`
- Remove global window registration of `Collection` and `Model` @kvdveer
- Add Dutch validation language support @kvdveer
- Add Russian validation language support @MihailRussu

## [0.1.1] - 2017-10-16
- Fix path inconsistencies
- Fix ES6 / CommonJS builds

## [0.1.1] - 2017-10-16
- Initial release and announcement

## [0.0.5] - 2017-09-13
- Test release





