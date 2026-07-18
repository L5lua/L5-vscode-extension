# Github Workflows

## The Existing Workflow

There is one file that exist right now as the workflows:

- `.github/workflows/publish.yaml`

### `publish.yaml`

This file runs through the packaging workflow using the github actions. This is triggered on the creation of a new tag and will update the `package.json` to reflect that tag, along with building the `.vsix` file that will be uploaded to the releases and marketplaces. 

### Resources

Some bookmarks that helped me through the process:

- [EclipseFdn Example CI](https://github.com/EclipseFdn/publish-extensions/blob/master/docs/exampleCI.yaml)
- [HaaLeo Publish VSCode Extension](https://github.com/HaaLeo/publish-vscode-extension#readme)