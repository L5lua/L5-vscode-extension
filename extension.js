// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

let currentInstances = new Map();
let statusBarItem;
let outputChannel;

const FIRST_RUN_KEY = 'l5.firstRunCompleted';

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

function validateLovePath(lovePath, platform) {
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

	const resolvedPath = findExecutableInPath(lovePath);
	if (resolvedPath) {
		return { valid: true, resolvedPath };
	}

	if (platform === 'linux') {

		let flatpakInstalled = findExecutableInPath("flatpak")

		if (flatpakInstalled) {
			return { valid: true, resolvedPath: FLATPAK_MARKER, isFlatpak: true };
		}

		return {
			valid: false,
			resolvedPath: lovePath,
			error: `LOVE executable "${lovePath}" not found in PATH. Install LOVE (e.g., 'sudo apt install love' or 'flatpak install flathub org.love2d.love2d') or set the full path in settings.`,
		};
	}

	return {
		valid: false,
		resolvedPath: lovePath,
		error: `LOVE executable "${lovePath}" not found. Please configure the correct path in settings.`,
	};
}

function checkFirstRun(context) {
	return !context.globalState.get(FIRST_RUN_KEY, false);
}

function isLoveProject() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return false;
	}

	const rootPath = workspaceFolders[0].uri.fsPath;
	const mainLuaPath = path.join(rootPath, 'main.lua');
	//const confLuaPath = path.join(rootPath, 'conf.lua');

	return fs.existsSync(mainLuaPath) //|| fs.existsSync(confLuaPath);
}

async function updateStatusBar() {
	if (!isLoveProject()) {
		statusBarItem?.hide();
		return;
	}

	if (!statusBarItem) {
		statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			100,
		);
	}

	if (currentInstances.size > 0) {
		statusBarItem.text = '$(debug-stop) Stop LOVE';
		statusBarItem.tooltip = 'Stop running LOVE instance';
		statusBarItem.command = 'l5.stop';
	} else {
		statusBarItem.text = '$(play) Run L5';
		statusBarItem.tooltip = 'Launch LOVE project (Alt+L)';
		statusBarItem.command = 'l5.launch';
	}
	statusBarItem.show();
}

async function showWelcomeMessage(context) {
	const platform = os.platform();

	let message;
	let needsConfiguration;

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

async function activate(context) {
	let maxInstances = vscode.workspace
		.getConfiguration('l5')
		.get('maxInstances');
	let overwrite = vscode.workspace.getConfiguration('l5').get('overwrite');

	outputChannel = vscode.window.createOutputChannel('LOVE');
	context.subscriptions.push(outputChannel);

	updateStatusBar();

	const fileWatcher =
		vscode.workspace.createFileSystemWatcher('**/{main,conf}.lua');
	await fileWatcher.onDidCreate(async () => await updateStatusBar());
	await fileWatcher.onDidDelete(async () => await updateStatusBar());
	context.subscriptions.push(fileWatcher);

	await vscode.workspace.onDidChangeWorkspaceFolders(
		async () => await updateStatusBar(),
	);

	const stopCommand = vscode.commands.registerCommand('l5.stop', () => {
		currentInstances.forEach((instance) => {
			if (!instance.killed) {
				instance.kill();
			}
		});
		currentInstances.clear();

		// check if flatpak is actually defined
		if (os.platform() === 'linux') {
			cp.spawn('flatpak', ['kill', FLATPAK_APP_ID], {
				detached: true,
				stdio: 'ignore',
			});
		}

		updateStatusBar();
	});
	context.subscriptions.push(stopCommand);

	const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
		const autoRestart = vscode.workspace
			.getConfiguration('l5')
			.get('autoRestartOnSave');

		if (
			autoRestart &&
			document.languageId === 'lua' &&
			currentInstances.size > 0
		) {
			vscode.commands.executeCommand('l5.launch');
		}
	});
	context.subscriptions.push(saveListener);

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

				const resolvedLovePath = validation.resolvedPath;
				const useFlatpak = validation.isFlatpak === true;
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

				if (process.pid) {
					await currentInstances.set(process.pid, process);
					console.log(currentInstances);
					await updateStatusBar();
				}
				process.stdout.on('data', (data) => {
					console.log(`LOVE stdout: ${data}`);
				});

				process.stderr.on('data', (data) => {
					console.error(`LOVE stderr: ${data}`);
				});
				outputChannel?.show(true);

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
