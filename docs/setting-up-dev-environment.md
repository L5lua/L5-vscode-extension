# Setting Up Developer Environment for Extension Testing

**Prerequisites**

- Install [VSCode](https://code.visualstudio.com/)/[Code-OSS](https://github.com/code-oss-dev/code) or [VSCodium](https://vscodium.com/)
- Clone or download this repository `git clone git@github.com:L5lua/L5-vscode-extension.git`

**Note**

There is a distinction between VSCode/Code-OSS vs. VSCodium, partially due to which marketplace is used and which version. At the time of this writing, the current versions are:

- VSCode: `1.128`
- Code-OSS: `1.100`
- VSCodium: `1.126`

VSCode and Code-OSS both use the VS Marketplace, but you can [override this](https://github.com/eclipse-openvsx/openvsx/wiki/Using-Open-VSX-in-VS-Code). This may not be necessary in the future.

## Running the Extension Locally

1. Clone or download the repository `git clone git@github.com:L5lua/L5-vscode-extension.git`
2. Open the extension folder in your editor. 
2. Navigate to the "Run and Debug" menu on the left-hand side-bar.
3. At the top of the newly-opened column, there should be a green arrow that says "Run Extension"
4. This will open a new editor window titled `Extension Development Host`.  
5. Now you have 2 windows: the first window that is debugging the extension, and a second window with the extension active. The first window will now be referred to as `Extension Debugger` and the second will be the `Extension Development Host`. 
    - *Note*: It is suggested to disable other extensions in the `Extension Development Host` window by opening the "Extensions" menu on the left-side bar → clicking the gear icon on a specific extension → `Disable (workspace)`
6. In the `Extension Development Host` window, open a folder that contains an L5 project.

After opening the folder, you should see on the bottom bar of the `Extension Development Host` window a `Run L5` button. You can customize different extensions settings by opening User Settings → Extensions → L5, and this is where you will add the path to your L5 project. 

## Restarting the Extension

You can use the `Extension Debugger` window to make changes to the extension regardless if it is running, but they won't be reflected until a restart. There are a few ways to restart:

If the extension IS NOT already running (meaning an `Extension Development Host` window is not already open): Repeat steps 2-3 above.

If the extension IS already running: In the center of the `Extension Debugger` window, there is a toolbar that has a green refresh button called "Restart" that will automatically

