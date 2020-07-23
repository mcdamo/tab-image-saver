# Tab Image Saver v3

There are new features in v3.0 as well as some big changes.

## Rulesets

Rulesets are a new feature that allows creating different sets of options for specific sites, like having a different profile for each website.

[Read more](README.md#rulesets)

## Path rules

[Path rules](README.md#path-rules) have changed a little in v3.0. The `ext`, `xExt`, `tabExt` no longer include the period (`.`) within the variable.

For example `<name><ext|.jpg>` should now be expressed as `<name>.<ext|jpg>`

This update attempts to automatically amend any rules you have saved, but please check there are no mistakes.

## Popup

A new popup panel has been created for easy access to the download actions. This can be accessed from the addon icon in the browser toolbar.

The popup can be disabled from the addon options, reverting the icon to the prior addon's behavour of running the default download action when clicked.

## Sidebar

A new sidebar page has been created. This is intended for testing or reviewing download errors.

### Testing

**Test current tab** will give a preview of which images are saved and their download filenames. Use this to test your options and rulesets are working as desired.

### Errors

If there were any errors with your last download they will be displayed here after selecting **Show errors*.

The errors will be grouped depending on whether there was a pathrule error (unable to generate a filename) or a download error (such as network error).

## Shortcuts

There are new keyboard shortcut options for the various download actions.

The addon context menu has also added the download actions for convenience. Right-click the addon icon on the browser toolbar to access this.