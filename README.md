# L5 Extension 

This extension runs L5 projects from VSCode and VSCodium. 

## Features

<!-- TODO: make gif of button running L5 projects -->

## Requirements

Install [Love2d](https://love2d.org/) on your computer. 

## Extension Settings

This extension contributes the following settings:

* `l5.path`: Path to your love executable. Windows: default path shown. Linux: use `love` if in PATH, or full path like `/usr/bin/love`. macOS: uses `open -n -a love` automatically if you have approved Love through your security settings.
* `l5.maxInstances`: Set the max amount of instance you want to be able to spawn at the same time. Defaults to `1`
* `l5.useConsoleSubsystem`: Should Löve be executed with the console subsystem? (Windows only)
* `l5.overwrite`: Should the launcher overwrite the first process when launching another one? Defaults to `true`.
* `l5.saveAllOnLaunch`: Should VS Code save all opened files on Löve launch? Defaults to `false`.
* `l5.autoRestartOnSave`: Automatically restart LÖVE when a Lua file is saved. Defaults to `false`.
* `l5.customArgs`: Additional command line arguments to pass to LÖVE (space-separated). Defaults to `""`.

## Contributing

There are a couple of docs that might be helpful in contributing to this extension!

- [Setting Up Developer Environment](./docs/setting-up-dev-environment.md) → Useful for getting the extension running on your own computer
- [How to Publish Extensions](./docs/how-to-publish-extension.md) → manual creation of `.vsix` files
- [Github Workflows](./docs/github-workflow.md) → how the Github Workflows work

## Known Issues

### MacOS Extra Security Approval

Because Love2d is an open-source game engine that is not installed through the App Store (and has not paid a $99 licensing fee), you will need to do an extra step to approve the application otherwise Love2d will not open.

When running the extension will prompt you to move the application to the trash.

<img src="/media/love-not-opened.png" style="width: 600px">

In order to bypass this, you will need to open System Settings → Privacy & Security and scroll to "Open Anyway"

<img src="/media/privacy-security-1.png" style="width: 600px">

When you press "Open Anyway", it will prompt again if you would like to "Open Anyway".

<img src="/media/privacy-security-2.png" style="width: 600px">

Then it will prompt for your computer password. 

<img src="/media/privacy-security-3.png" style="width: 600px">

It will then launch Love2d normally. You can close this application and you will be able to run L5 projects!

## Release Notes

### 0.0.1

Beta release to test on non-Mac devices. 