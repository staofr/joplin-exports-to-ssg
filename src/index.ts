import joplin from 'api';
import { MenuItemLocation } from 'api/types';

const fs = (joplin as any).require('fs-extra');
const path = require('path');

function sanitizeTitle( title: string ) {
	return title.replace(/[\/\\?%*:|"<>]/g, '-');
}

function getTopLevelHeading(noteBody: string) {
	const match = noteBody.match(/^#\s+(.+)$/m);
	return match ? match[1].trim() : '';
}

async function getFolderNotes(folderId: string) {
	let page = 1;
	let hasMore = true;
	let notes: any[] = [];

	while (hasMore) {
		const response = await joplin.data.get(['folders', folderId, 'notes'], {
			fields: ['id', 'title', 'body', 'parent_id'],
			page: page,
		});

		notes = notes.concat(response.items);
		hasMore = !!response.has_more;
		page++;
	}

	return notes;
}

async function getAllFolders() {
	let page = 1;
	let hasMore = true;
	let folders: any[] = [];

	while (hasMore) {
		const response = await joplin.data.get(['folders'], {
			fields: ['id', 'title', 'parent_id'],
			page: page,
		});

		folders = folders.concat(response.items);
		hasMore = !!response.has_more;
		page++;
	}

	return folders;
}

async function getFolderTree(folderId: string, allFolders: any[], relativePath = '') {
	const folder = allFolders.find(folderItem => folderItem.id === folderId);
	if (!folder) {
		throw new Error(`Folder not found: ${folderId}`);
	}

	const notes = await getFolderNotes(folderId);
	const folders = [{ folder, relativePath, notes }];

	const childFolders = allFolders.filter(folderItem => folderItem.parent_id === folderId);

	for (const childFolder of childFolders) {
		const childRelativePath = path.join(relativePath, sanitizeTitle(childFolder.title));
		const childTree = await getFolderTree(childFolder.id, allFolders, childRelativePath);
		folders.push(...childTree);
	}

	return folders;
}

joplin.plugins.register({
	onStart: async function () {
		/*******************Dialog Configurations*******************/
		const dialogs = joplin.views.dialogs;
		const ssg_dialog = await dialogs.create('SSG-Dialog');

		//---------setting dailog UI
		await dialogs.setHtml(ssg_dialog, `
		<div class="dialog" >
			<div class="dialog-header">
				<h2>Exporting Configuration</h2>
			</div>
			<div class="dialog-main">
				<form id="swg-form" name="basic_info">
            	    <div class="field">
            	        <label class="block-element labels" for="dest_Path"> Export Path (<span>*required</span>) </label>
					    <input class="block-element" id="dest_Path" type="text" name="dest_Path" required autocomplete value="C:\\md2blogN\\content\\posts" />   
            	    </div>
			    	    <div class="field">
					    <label class="block-element labels" for="frontMatter" >Front Matter (<span>optional</span>) </label>
					    <textarea class="block-element" id="frontMatter" rows="8" cols="20" name="frontMatter">---
title: Get the note name
description: Get the top-level heading
date: Get the current date
---</textarea>
            	    </div>
            	    <div class="field">
					    <label class="block-element labels" for="footerMatter" >Footer Matter (<span>optional</span>) </label>
					    <textarea class="block-element" id="footerMatter" rows="8" cols="20" name="footerMatter">---
## 联系我

[<img alt="Phone" src="https://api.iconify.design/mdi/phone.svg?color=%23485D55" width="28" height="28" class="jop-noMdConv">](tel:0952966666)&nbsp;&nbsp; [<img alt="Email" src="https://cdn.simpleicons.org/gmail/485D55" width="28" height="28" class="jop-noMdConv">](mailto:m@stao.fr)&nbsp;&nbsp; [<img alt="Discord" src="https://cdn.simpleicons.org/discord/5865F2" width="28" height="28" class="jop-noMdConv">](https://discord.gg/pp3FyfnnTW)&nbsp;&nbsp; [<img alt="Telegram" src="https://cdn.simpleicons.org/telegram/26A5E4" width="28" height="28" class="jop-noMdConv">](https://t.me/+v8mkJAHapSU0Yzgx)&nbsp;&nbsp; [<img alt="WhatsApp" src="https://cdn.simpleicons.org/whatsapp/25D366" width="28" height="28" class="jop-noMdConv">](https://wa.me/33326402301)&nbsp;&nbsp; [<img alt="Wechat" src="https://cdn.simpleicons.org/wechat/07C160" width="28" height="28" class="jop-noMdConv">](https://cloud.msun.fr/prive/logos/stao-wechat-qr.png)
---</textarea>
            	    </div>
				</form> 
			</div>
		</div>
		`);

		//---------add the css file for form
		await dialogs.addScript(ssg_dialog, './form.css');

		//---------setting controls of dialog
		await dialogs.setButtons(ssg_dialog, [
			{
				id: 'submit',
				title : 'Export',
			},
			{
				id: 'cancel',
				title:'Cancel'
			}
		]);

		/*******************Exporting Code*******************/
		await joplin.commands.register({
            name: 'exportingProcedure',
			execute: async (...args) => {
				try {
					//---------prequesite variables
					let dest_Path = args[1].basic_info.dest_Path.trim();
					let frontMatter = args[1].basic_info.frontMatter || '';
					let footerMatter = args[1].basic_info.footerMatter || '';
					const allFolders = await getAllFolders();
					const foldersToExport = await getFolderTree(args[0], allFolders);
					const totalNotes = foldersToExport.reduce((count, folderData) => count + folderData.notes.length, 0);

					if (totalNotes === 0) {
						await joplin.views.dialogs.showMessageBox('No notes found in this folder!');
						return;
					}

					await fs.mkdirp(dest_Path);

					for (const folderData of foldersToExport) {
						const folderOutputPath = path.join(dest_Path, folderData.relativePath);
						await fs.mkdirp(folderOutputPath);

						for (const note of folderData.notes) {
							let today = new Date();
							let formattedDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
							let topLevelHeading = getTopLevelHeading(note.body);

							let noteFrontMatter = frontMatter
								.replace('Get the note name', note.title)
								.replace('Get the top-level heading', topLevelHeading)
								.replace('Get the current date', formattedDate);

							note.body = noteFrontMatter + (noteFrontMatter ? '\n' : '') + note.body + (footerMatter ? '\n' : '') + footerMatter;
							const safeTitle = sanitizeTitle(note.title);
							await fs.writeFile(path.join(folderOutputPath, `${safeTitle}.md`), note.body);
						}
					}
				
				await joplin.views.dialogs.showMessageBox('Export completed successfully!');
				} catch (error) {
					await joplin.views.dialogs.showMessageBox('Export failed: ' + error.message);
				}
            }
		});
		
		/*******************Driver Code*******************/

		//---------respective command for main button
		await joplin.commands.register({
            name: 'staticSiteExporterDialog',
            label: 'Export to SSG',
            execute: async (folderId: string) => {
				const { id, formData } = await dialogs.open(ssg_dialog);
				if (id == "submit") {
					//---------form validation
					if (!formData.basic_info.dest_Path || !path.isAbsolute(formData.basic_info.dest_Path.trim())) {
						await joplin.views.dialogs.showMessageBox('Provided path is not valid.');
						return;
					}
                    await joplin.commands.execute('exportingProcedure', folderId , formData);
                }
            },
		});
		
		//---------created main button[entry point to plugin]
		await joplin.views.menuItems.create('Export to SSG', 'staticSiteExporterDialog', MenuItemLocation.FolderContextMenu);
	},
});
