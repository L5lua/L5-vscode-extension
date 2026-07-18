// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// stores all the instances of Love2d running
let currentInstances = new Map();
// actual "Run L5" button in menu
let statusBarItem;
let outputChannel;

// property to check if this is the first time L5 installed
const FIRST_RUN_KEY = 'l5.firstRunCompleted';

// check which system and which default love path is specified
function getDefaultLovePath() {
	const platform = os.platform();
	if (platform === 'win32') {
		return 'C:\\Program Files\\LOVE\\love.exe';
	} else if (platform === 'darwin') {
		return '/Applications/love.app/Contents/MacOS/love';
	} else {
		return 'love';
	}
}

// find Love2d in the specified path
function findExecutableInPath(executable) {
	const pathEnv = process.env.PATH || '';
	const pathSeparator = os.platform() === 'win32' ? ';' : ':';
	const paths = pathEnv.split(pathSeparator);

	for (const dir of paths) {
		const fullPath = path.join(dir, executable);
		if (fs.existsSync(fullPath)) {
			try {
				fs.accessSync(fullPath, fs.constants.X_OK);
				return fullPath;
			} catch {
				continue;
			}
		}
	}
	return null;
}

// check whether or not Love2d is on the path for the specific platform
function validateLovePath(lovePath, platform) {

	// if the path is absolute, then it should be fine
	if (path.isAbsolute(lovePath)) {
		if (fs.existsSync(lovePath)) {
			return { valid: true, resolvedPath: lovePath };
		}
		return {
			valid: false,
			resolvedPath: lovePath,
			error: `LOVE executable not found at: ${lovePath}`,
		};
	}

	// otherwise, check for relative path / added love to path
	const resolvedPath = findExecutableInPath(lovePath);
	if (resolvedPath) {
		return { valid: true, resolvedPath };
	} else if (platform === 'linux') {
		return {
			valid: false,
			resolvedPath: lovePath,
			error: `LOVE executable "${lovePath}" not found in PATH. Install LOVE (e.g., 'sudo apt install love') or set the full path in settings.`,
		};
	}

	// otherwise, can't find Love2d on the path
	return {
		valid: false,
		resolvedPath: lovePath,
		error: `LOVE executable "${lovePath}" not found. Please configure the correct path in settings.`,
	};
}

// is this the first time you ran the extension?
function checkFirstRun(context) {
	return !context.globalState.get(FIRST_RUN_KEY, false);
}

// is the current workspace a L5 project?
function isLoveProject() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return false;
	}

	const rootPath = workspaceFolders[0].uri.fsPath;
	const mainLuaPath = path.join(rootPath, 'main.lua');
	const libLuaPath = path.join(rootPath, 'L5.lua');

	return fs.existsSync(mainLuaPath) || fs.existsSync(libLuaPath);
}

// is an L5 project already running using Love2d?
async function updateStatusBar() {
	// is this project not L5 project? don't show "Run L5" button
	if (!isLoveProject()) {
		statusBarItem?.hide();
		return;
	}

	// does button exist? if not, add it to the status bar
	if (!statusBarItem) {
		statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			100,
		);
	}

	// if love is running, change language to "Stop Love"
	if (currentInstances.size > 0) {
		statusBarItem.text = '$(debug-stop) Stop LOVE';
		statusBarItem.tooltip = 'Stop running LOVE instance';
		statusBarItem.command = 'l5.stop';
	} else { // otherwise, language of button should be "Run L5"
		statusBarItem.text = '$(play) Run L5';
		statusBarItem.tooltip = 'Launch LOVE project (Alt+L)';
		statusBarItem.command = 'l5.launch';
	}

	// update the display of the button
	statusBarItem.show();
}

// display message when first running
async function showWelcomeMessage(context) {
	const platform = os.platform();

	let message;
	let needsConfiguration;

	// these technically all do the same thing, but may need configuration later on based on OS tests
	if (platform === 'darwin') {
		message =
			'Welcome to the L5 Extension! Please configure the path to your LOVE executable to get started.';
		needsConfiguration = true;
	} else if (platform === 'win32') {
		message =
			'Welcome to the L5 Extension! Please configure the path to your LOVE executable to get started.';
		needsConfiguration = true;
	} else {
		message =
			'Welcome to the L5 Extension! Please configure the path to your LOVE executable (or ensure "love" is in your PATH).';
		needsConfiguration = true;
	}

	const buttons = needsConfiguration ? ['Open Settings', 'Dismiss'] : ['OK'];

	const result = await vscode.window.showInformationMessage(
		message,
		...buttons,
	);

	if (result === 'Open Settings') {
		await vscode.commands.executeCommand(
			'workbench.action.openSettings',
			'l5.path',
		);
	}

	await context.globalState.update(FIRST_RUN_KEY, true);

	return needsConfiguration;
}

// this is what happens when the exetension is run
// context: vscode.ExtensionContext
async function activate(context) {
	// retrieve configurations from the extension settings
	// to customize, open User Settings → Extensions → L5
	let maxInstances = vscode.workspace
		.getConfiguration('l5')
		.get('maxInstances');
	let overwrite = vscode.workspace.getConfiguration('l5').get('overwrite');

	// outputChannels are read-only textual information
	outputChannel = vscode.window.createOutputChannel('LOVE');
	// subscriptions are the disposables
	context.subscriptions.push(outputChannel);
	// basically the extension opens things and adds them to subscriptions
	// when extension stops / disabled / uninstalled, it deletes any running subscriptions

	updateStatusBar();

	// handles watching files for changes to restart Love2d instance
	const fileWatcher =
		vscode.workspace.createFileSystemWatcher('**/{main,conf}.lua');
	fileWatcher.onDidCreate(updateStatusBar());
	fileWatcher.onDidDelete(updateStatusBar());
	context.subscriptions.push(fileWatcher);
	// add the filewatcher to what the extension is monitoring

	// if a new folder is opened or a new workspace created, check if L5.lua and main.lua still exist
	vscode.workspace.onDidChangeWorkspaceFolders(updateStatusBar());

	// check if stop event triggered (closing Love2d or pressing stop button)
	const stopCommand = vscode.commands.registerCommand('l5.stop', () => {
		currentInstances.forEach((instance) => {
			if (!instance.killed) {
				instance.kill();
			}
		});
		currentInstances.clear();

		updateStatusBar();
	});
	context.subscriptions.push(stopCommand);
	// add stop event handling to extension monitoring

	// check if file was saved
	const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
		// retrieve preference on auto-restart on saving
		const autoRestart = vscode.workspace
			.getConfiguration('l5')
			.get('autoRestartOnSave');

		// if auto-restart enabled, on save run l5.launch command
		if (
			autoRestart &&
			document.languageId === 'lua' &&
			currentInstances.size > 0
		) {
			vscode.commands.executeCommand('l5.launch');
		}
	});
	context.subscriptions.push(saveListener);
	// add save-watcher event handling to extension monitoring

	// the action that happens when Love2d is launched from the status bar button
	let disposable = vscode.commands.registerCommand('l5.launch', async () => {
		// Check for first run and show welcome message
		if (checkFirstRun(context)) {
			const needsConfiguration = await showWelcomeMessage(context);
			if (needsConfiguration) {
				return;
			}
		}

		// Get the directory of the currently active file as fallback
		let actDocPath = vscode.window.activeTextEditor?.document.uri.fsPath;
		if (actDocPath) {
			actDocPath = path.dirname(actDocPath);
		}
		// Check if we have a valid path to work with
		if (actDocPath !== undefined) {
			if (currentInstances.size < maxInstances || overwrite) {
				const platform = os.platform();
				let lovePath = String(
					vscode.workspace.getConfiguration('l5').get('path'),
				);

				// if user did not change default love path (windows) and their system is not windows
				const windowsDefault = 'C:\\Program Files\\LOVE\\love.exe';
				if (lovePath === windowsDefault && platform !== 'win32') {
					lovePath = getDefaultLovePath();
				}

				// check if Love2d is able to be found on the correct comptuer path
				const validation = validateLovePath(lovePath, platform);
				if (!validation.valid) {
					const result = await vscode.window.showErrorMessage(
						validation.error || 'LOVE executable not found.',
						'Open Settings',
					);
					if (result === 'Open Settings') {
						await vscode.commands.executeCommand(
							'workbench.action.openSettings',
							'l5.path',
						);
					}
					return;
				}

				// real real path now
				const resolvedLovePath = validation.resolvedPath;
				// retrieve user preferences from extension settings
				const useConsoleSubsystem = vscode.workspace
					.getConfiguration('l5')
					.get('useConsoleSubsystem');
				const saveAllOnLaunch = vscode.workspace
					.getConfiguration('l5')
					.get('saveAllOnLaunch');
				const customArgsStr = String(
					vscode.workspace.getConfiguration('l5').get('customArgs') || '',
				);
				const customArgs = customArgsStr
					.split(/\s+/)
					.filter((arg) => arg.length > 0);

				if (saveAllOnLaunch) {
					vscode.workspace.saveAll();
				}

				if (overwrite) {
					currentInstances.forEach((instance) => {
						if (!instance.killed) {
							instance.kill();
						}
					});
					currentInstances.clear();
					outputChannel?.clear();
				}

				const Folders = vscode.workspace.workspaceFolders;
				let loveProjectPath = actDocPath;
				if (Folders) {
					loveProjectPath = Folders[0].uri.fsPath;
				}

				// this will be the node.child_process
				// retrieves the Love2d binary / executable 
				let process;

				if (platform === 'win32') {
					const args = useConsoleSubsystem
						? [loveProjectPath, '--console', ...customArgs]
						: [loveProjectPath, ...customArgs];
					process = await cp.spawn(resolvedLovePath, args);
				} else {
					process = await cp.spawn(resolvedLovePath, [
						loveProjectPath,
						...customArgs,
					]);
				}

				// if process.pid exists, add it to the list of current instances
				if (process.pid) {
					await currentInstances.set(process.pid, process);
					console.log(currentInstances);
					await updateStatusBar();
				}
				// prints data from Love2d to the console
				process.stdout.on('data', (data) => {
					console.log(`LOVE stdout: ${data}`);
				});
				// prints errors from Love2d to the console
				process.stderr.on('data', (data) => {
					console.error(`LOVE stderr: ${data}`);
				});
				outputChannel?.show(true);
				// yes we want to show these to the user console

				// if close event detected, remove it from tracked instances 
				// and close Love2d instance running
				process.on('exit', (code, signal) => {
					if (process.pid && !process.spawnargs.includes('open')) {
						currentInstances.delete(process.pid);
						console.log(
							`LOVE process closed with code ${code}, signal ${signal}`,
						);
					}
					updateStatusBar();
				});
				process.on('close', (code, signal) => {
					updateStatusBar();
				});

				// if something wrong, inform the user
				process.on('error', async (err) => {
					const result = await vscode.window.showErrorMessage(
						`Failed to launch LOVE: ${err.message}`,
						'Open Settings',
					);
					if (result === 'Open Settings') {
						await vscode.commands.executeCommand(
							'workbench.action.openSettings',
							'l5.path',
						);
					}
					if (process.pid) {
						currentInstances.delete(process.pid);
					}
					updateStatusBar();
				});
			} else {
				vscode.window.showErrorMessage(
					'You have reached your max concurrent Löve instances. You can change this setting in your config.',
				);
			}
		} else {
			/* Undefined workspace folder leads to error msg. */
			vscode.window.showErrorMessage(
				'vscode.workspace.workspaceFolders is undefined. Please check that you have opened you project as a workspace.',
			);
		}
	});

	context.subscriptions.push(disposable);
	// have extension keep track of running L5 window

	if (statusBarItem) {
		context.subscriptions.push(statusBarItem);
	}
}

function deactivate() {
	statusBarItem?.dispose();
}

module.exports = {
	activate,
	deactivate,
};
