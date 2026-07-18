# How to Package and Publish Extension 

## Manually Packaging and Uploading using the CLI

A `.vsix` file needs to be created in order to create a release on GitHub, and adding the extension to relevant marketplaces (focusing on OpenVSX and VSCode). This section covers how to make the `.vsix` manually, but this should automatically be built via the existing [Github Workflow](./github-workflow.md).

The version that is currently used is the version inside the `package.json`. These are updated using the workflows, but intitally were manually updated. 

#### Open VSX

**Prerequisites**

1. Access to the L5lua namespace in https://open-vsx.org/user-settings/namespaces
2. A token created in https://open-vsx.org/user-settings/tokens
3. Ensure you have the [`ovsx` library](https://www.npmjs.com/package/ovsx) installed.

These are also steps 1-3 in [OpenVSX Publishing Extensions Wiki](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions). The only difference is having access to the publisher.

Once you have access to the namespace and a token, run the command:

```sh
npx ovsx publish -p <your-token>
```

This will create a `.vsix` file and automatically upload it to OpenVSX.

#### VS Marketplace

**Prerequisites**

1. Access to the L5lua organization in https://dev.azure.com/L5lua/
2. Ensure you have the [`@vscode/vsce` library](https://www.npmjs.com/package/@vscode/vsce) installed.

These are from [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) in the VSCode Extension API.

Unlike OpenVSX, you can separately package and publish extensions:

```sh
vsce package
```

```sh
vsce publish
```