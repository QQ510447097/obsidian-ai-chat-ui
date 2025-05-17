import { Plugin, MarkdownPostProcessorContext } from 'obsidian';

export default class ChatPlugin extends Plugin {
	async onload() {
		// 右键菜单插入模板
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor) => {
				menu.addItem((item) => {
					item
						.setTitle('插入对话区域')
						.setIcon('message-square')
						.onClick(() => {
							const template =
								"```chat-ui\n" +
								"A：发言人A名称\n" +
								"B：发言人B名称\n" +
								"（在此输入对话内容）\n" +
								"```";
							editor.replaceSelection(template);
							editor.setCursor(editor.getCursor().line + 2, 3); // 光标定位到A名称
						});
				});
			})
		);

		// 注册处理器
		this.registerMarkdownCodeBlockProcessor('chat-ui', (source, el, ctx) => {
			const lines = source.split('\n');
			const container = el.createDiv({ cls: 'chat-container' });

			// 解析角色名称
			const [aLine, bLine, ...contentLines] = lines;
			const speakerA = aLine.replace('A：', '').trim();
			const speakerB = bLine.replace('B：', '').trim();

			// 状态追踪
			let currentSpeaker: string | null = null;
			let currentContent: string[] = [];

			// 定义发言块结束条件
			const isNewBlock = (line: string) =>
				line.startsWith(`${speakerA}：`) ||
				line.startsWith(`${speakerB}：`) ||
				line.trim() === '';

			// 处理每一行
			contentLines.forEach(line => {
				if (isNewBlock(line)) {
					// 遇到新块时输出已缓存内容
					if (currentSpeaker && currentContent.length > 0) {
						this.renderBubble(container, currentSpeaker, speakerA, currentContent.join('\n'));
						currentContent = [];
					}

					// 解析新发言者
					if (line.startsWith(`${speakerA}：`)) {
						currentSpeaker = speakerA;
						const content = line.slice(speakerA.length + 1).trim();
						if (content) currentContent.push(content);
					} else if (line.startsWith(`${speakerB}：`)) {
						currentSpeaker = speakerB;
						const content = line.slice(speakerB.length + 1).trim();
						if (content) currentContent.push(content);
					}
				} else if (currentSpeaker) {
					// 累积内容行
					currentContent.push(line.trim());
				}
			});

			// 处理最后一个块
			if (currentSpeaker && currentContent.length > 0) {
				this.renderBubble(container, currentSpeaker, speakerA, currentContent.join('\n'));
			}
		});
	}

	private renderBubble(container: HTMLElement, speaker: string, speakerA: string, content: string) {
		const isLeft = speaker === speakerA;
		const bubble = container.createDiv({ cls: `chat-bubble ${isLeft ? 'left' : 'right'}` });

		// 角色标签
		bubble.createEl('div', {
			cls: 'role-tag',
			text: `${speaker}`
		});

		// 内容区域
		const contentDiv = bubble.createDiv({ cls: 'content' });
		contentDiv.innerHTML = content
			.replace(/（(.*?)）/g, '<em class="action">$1</em>') // 转换动作描述
			.replace(/\n/g, '<br>'); // 保留换行
	}
}