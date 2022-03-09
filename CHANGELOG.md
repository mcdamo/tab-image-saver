v4.0.5
======
 - Fix enable/disable via addon manager

v4.0.2
======
 - Add console logging

v4.0.1
======
 - Fix ruleset index if in invalid state

v4.0.0
======
 - New Path rules syntax based on template strings
 - New Import/export of addon settings
 - New download indexing options for per-tab and continuing

v3.0.6
======
 - Fix Options focus adding new rules

v3.0.5
======
 - Refactor version updater

v3.0.4
======
 - Bump Min Firefox version to FF73
 - Fix bug causing options page to be blank
 - Fix Cancel button operation

v3.0.3
======
 - Fix event listeners

v3.0.2
======
 - Fix addon fails to reload when disable is toggled in Extensions manager

v3.0.1
======
 - Fix Download in Private Browsing Mode option could be selected when not enabled by the browser settings
 - Fix Skip Discarded Tabs option could not be selected
 - Fix Sidebar and Popup broken in Private Windows

v3.0.0
======
 - Added Rulesets for targeting options to specific sites
 - New preferences page
 - `<ext>` pathRule no longer includes the period `.`, pathRules changed to `.<ext>`
 - Added new keyboard shortcuts options

v2.5.6
======
 - Removed code requiring min version FF67

v2.5.5
======
 - Fixed content-disposition for UTF-8 filename #43
 - Fixed path rules bug: when many OR conditions only the first and last was tested #43

v2.5.4
======
 - Fixed private download option, setting had no effect.
 - Fixed clear history option, setting affected private downloading.
 - Fixed issue where tab may be closed before images where downloaded, when downloading multiple images in tab.

v2.5.3
======
 - Fixed download reliability with referrer header

v2.5.2
======
 - Performance improvements
 - Increased testing coverage

v2.5.1
======
 - Fixed regression in Path Rules
 - Fixed using browser cache to save images #37

v2.5.0
======
 - Fixed input validation for numeric options
 - Fixed badge text color (API changed in FF63)
 - Fixed addon not working in private browsing mode #35
 - Added Path Rule options for tab page title and URL
 - Added option for asynchronous downloading (faster, but files not guaranteed to be numbered in order if using #index naming)
 - Added option for number of simultaneous downloads
 - Added option to clear download history

v2.4.1
======
 - Fixed fr-FR translation by AntoineTurmel #33

v2.4.0
======
 - Added option to ignore unloaded tabs #26

v2.3.2
======
 - Added zh-CN translation by yfdyh000 #30

v2.3.1
======
 - Added fr-FR translation by tducasse #28
 - Added pt-BR translation by rafaelhipercg #27

v2.3.0
======
 - Added l10n framework
 - Added filter to skip tabs without URLs #25

v2.2.2
======
 - Fixed bug with URL-encoded filenames #21

v2.2.1
======
 - Fixed bug running addon with default options #19

v2.2.0
======
 - Added Path Rules preference for generating filenames
 - Removed altIsFilename preferences (handled by Path Rules now)

v2.1.1
======
 - Fixed regression with path and filename sanitization #18

v2.1.0
======
 - Added protection from running concurrently in the same window
 - Added context menus for browser-action to open preferences and downloads folder
 - Changed Addon manifest, new permisison required for menus

v2.0.5
======
 - Changed icons

v2.0.4
======
 - Changed runtime to remove event listeners when addon finishes

v2.0.3
======
 - Added detection for downloads when type is not image to raise error
 - Fixed condition where failed download would hang addon
 - Fixed filename creation to not use altIsFilename for direct images
 - Added runtime to cancel ongoing downloads when user cancels addon

v2.0.2
======
 - Changed filename creation to use browsers inbuilt URL parser

v2.0.1a
=======
 - Fixed bug in tab closure

v2.0.0
======
 - Changed icons
 - Changed runtime handling to rely on promises instead of polling
 - Added feature for running addon concurrently in different windows
 - Added feature to cancel running operation by clicking browser-action icon
 - Added feature to display runtime status using badge icons
 - Added preference for keyboard shortcut #7
 - Changed manifest minimum version to FF60

v1.3.0
======
 - Added preference to use image alt text as filename #14

v1.2.2
======
 - Fixed detection of image dimensions #10

v1.2.1
======
 - Fixed creating filename for encoded URLs

v1.2.0
======
 - Added preference for downloading all images in each tab #5
 - Added preference to use incognito mode for hiding download history
 - Changed manifest minimum version to FF57

v1.1.2
======
 - Fixed filename creation to ignore query string #4

v1.1.1
======
 - Fixed compatibility with Download API changes in FF58 #8
 - Changed manifest minimum version to FF52

v1.1.0
======
 - Added preference to only save direct image tabs
 - Fixed "all tabs" not executing

v1.0.3
======
 - Fixed notification showing after every file download

v1.0.2
======
 - Changed icons

v1.0.1
======
 - Changed manifest minimum version to FF48

v1.0
====
 - Initial release
