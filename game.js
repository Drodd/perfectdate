// 游戏状态
let gameState = {
    currentPlot: 'plot1',
    playerRole: null, // 'male' 或 'female'
    choices: [],
    dialogueHistory: [],
    isWaitingForAuto: false,
    waitingBubble: null,
    pendingUnlockMessage: null // 待显示的解锁消息
};

// 历史记录存储
const STORAGE_KEY = 'datenight_game_history';

// 需要解锁角色选择的选项
const UNLOCK_CHOICES = ['care', 'compliment', 'environment', 'ask_about_her'];

// 获取历史记录
function getGameHistory() {
    const stored = localStorage.getItem(STORAGE_KEY);
    let history;
    
    if (stored) {
        try {
            history = JSON.parse(stored);
        } catch (e) {
            // 如果解析失败，使用默认值
            history = {};
        }
    } else {
        history = {};
    }
    
    // 确保所有必需的字段都存在
    return {
        maleChoices: history.maleChoices || {},
        femaleChoices: history.femaleChoices || {},
        unlockedChoices: history.unlockedChoices || [], // 已解锁的选项
        characterSelectionUnlocked: history.characterSelectionUnlocked || false, // 角色选择是否解锁
        isFirstTime: history.isFirstTime !== false // 是否第一次游玩，默认为true
    };
}

// 保存历史记录
function saveGameHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// 检查是否解锁角色选择
function checkCharacterSelectionUnlock() {
    const history = getGameHistory();
    
    // 检查是否所有必需选项都已选择过
    const hasAllChoices = UNLOCK_CHOICES.every(choice => 
        history.unlockedChoices.includes(choice)
    );
    
    if (hasAllChoices && !history.characterSelectionUnlocked) {
        history.characterSelectionUnlocked = true;
        saveGameHistory(history);
        
        // 第一次解锁时，设置默认选中女生
        selectedCharacterForRestart = 'female';
        
        // 保存解锁消息，在下次失败弹窗时显示
        gameState.pendingUnlockMessage = '走入死胡同了？换个视角看看吧！';
        return true;
    }
    
    return history.characterSelectionUnlocked;
}

// 记录选择并检查解锁
function recordChoice(choiceId) {
    const history = getGameHistory();
    
    if (UNLOCK_CHOICES.includes(choiceId) && !history.unlockedChoices.includes(choiceId)) {
        history.unlockedChoices.push(choiceId);
        saveGameHistory(history);
        
        // 检查是否解锁角色选择
        checkCharacterSelectionUnlock();
    }
}

// 默认AI选择配置
const defaultAIChoices = {
    male: {
        plot1: 'care', // 关心对方
        plot3_engaged: 'ask_about_her', // 聊聊她
        plot5: 'mysterious' // 保持神秘
    },
    female: {
        plot2: 'polite', // 你感到尴尬
        plot4: 'not_interested', // 你感到虚伪
        plot6: 'mysterious' // 你感到虚伪
    }
};

// 游戏数据结构
const gameData = {
    plot1: {
        type: 'male',
        description: '男生的开场白选择',
        choices: [
            {
                id: 'care',
                text: '关心对方',
                dialogue: '今天外面有点冷，要不要先点杯热的暖暖手？',
                next: 'plot2'
            },
            {
                id: 'compliment',
                text: '称赞外表',
                dialogue: '你这件外套真好看，颜色很衬你，挺有气质的。',
                next: 'plot2'
            }
        ]
    },
    plot2: {
        type: 'female',
        description: '女生的回应选择',
        choices: [
            {
                id: 'polite',
                text: '你感到尴尬',
                dialogue: '还好啦，谢谢。',
                next: 'plot3_polite'
            },
            {
                id: 'engaged',
                text: '你感到轻松',
                dialogue: '哈哈，谢谢。最近太忙了，都没来得及回家换件衣服。',
                next: 'plot3_engaged'
            }
        ]
    },
    plot3_polite: {
        type: 'male',
        description: '男生聊环境（当女生选择礼貌回应时）',
        choices: [
            {
                id: 'environment',
                text: '聊环境',
                dialogue: '这家店环境还不错吧，灯光挺柔和的，感觉挺适合聊天。',
                next: 'plot7'
            },
            {
                id: 'ask_about_her',
                text: '聊对方',
                dialogue: '对了，你平时都喜欢干什么？有没有什么特别想做的事啊？',
                next: 'plot7'
            }
        ]
    },
    plot3_engaged: {
        type: 'male',
        description: '男生的话题选择（当女生选择用心回应时）',
        choices: [
            {
                id: 'ask_about_her',
                text: '聊对方',
                dialogue: '对了，你平时都喜欢干什么？有没有什么特别想做的事啊？',
                next: 'plot7'
            },
            {
                id: 'talk_about_busy',
                text: '找共鸣',
                dialogue: '我最近也很忙，不过一想到能来见你，还是挺开心的。',
                next: 'plot4'
            }
        ]
    },
    plot4: {
        type: 'female',
        description: '女生对男生工作的反应',
        choices: [
            {
                id: 'curious',
                text: '你感到好奇',
                dialogue: '哈哈这么巧，我们不会是同行吧？',
                next: 'plot5'
            },
            {
                id: 'not_interested',
                text: '你感到下头',
                dialogue: '不好意思...下次再约...',
                next: 'ending_failed'
            }
        ]
    },
    plot5: {
        type: 'male',
        description: '男生选择是否透露工作信息',
        choices: [
            {
                id: 'mysterious',
                text: '保持神秘',
                dialogue: '嘿嘿，你猜？',
                next: 'plot7'
            },
            {
                id: 'introduce_self',
                text: '介绍自己',
                dialogue: '我是做产品设计的，经常要对着用户琢磨需求，脑子都要烧坏了哈哈。',
                next: 'plot6'
            }
        ]
    },
    plot6: {
        type: 'female',
        description: '女生的最终回应',
        choices: [
            {
                id: 'introduce_self',
                text: '你感到轻松',
                dialogue: '哈哈！我在出版社做编辑，平时和稿子打交道比较多，但偶尔也写写书评、去展览转转。',
                next: 'ending_perfect'
            },
            {
                id: 'mysterious',
                text: '你感到下头',
                dialogue: '不好意思...下次再约...',
                next: 'ending_failed'
            }
        ]
    },
    plot7: {
        type: 'female',
        description: '女生的最终回应2',
        choices: [
            {
                id: 'leave',
                text: '你感到下头',
                dialogue: '不好意思...下次再约...',
                next: 'ending_failed'
            }
        ]
    }
};

// 结局设定
const endings = {
    ending_failed: {
        title: '约会失败',
        message: '不知为什么，对方提前离开了。不要灰心，再接再厉！',
        type: 'failed'
    },
    ending_perfect: {
        title: '完美结局！',
        message: '恭喜！你成功了，爱情不是一厢情愿，希望你能有所收获！',
        type: 'success'
    }
};

// 开始游戏
function startGame() {
    // 隐藏标题界面
    const titleScreen = document.getElementById('titleScreen');
    titleScreen.classList.add('hidden');
    
    // 淡出失败背景，显示正常背景
    const backgroundFail = document.getElementById('backgroundFail');
    backgroundFail.classList.add('hide');
    
    // 1秒后开始实际游戏
    setTimeout(() => {
        selectCharacter('male');
    }, 800);
}

// 角色选择
function selectCharacter(role) {
    gameState.playerRole = role;
    
    // 更新重新开始时的默认选择
    selectedCharacterForRestart = role;
    
    // 角色显示已移除
    
    // 重置失败背景（仅在游戏重启时）
    const backgroundFail = document.getElementById('backgroundFail');
    if (backgroundFail.classList.contains('show')) {
        backgroundFail.classList.remove('show');
        backgroundFail.classList.add('hide');
    }
    
    // 隐藏弹窗并初始化游戏
    const endingMessage = document.getElementById('endingMessage');
    endingMessage.classList.add('hidden');
    endingMessage.classList.remove('show');
    initGame();
}

// 初始化游戏
function initGame() {
    gameState.currentPlot = 'plot1';
    gameState.choices = [];
    gameState.dialogueHistory = [];
    gameState.isWaitingForAuto = false;
    gameState.waitingBubble = null;
    
    // 清空对话气泡
    const dialogueBubbles = document.getElementById('dialogueBubbles');
    dialogueBubbles.innerHTML = '';
    
    // 添加开场气泡
    const narratorText = '这是你们第一次见面...';
    addDialogueBubble(narratorText, 'narrator');
    
    // 根据旁白文字长度计算延迟时间，等旁白显示完成后再显示选项
    const narratorDelay = narratorText.length * 80 + 800; // 基于打字速度计算 + 额外800ms缓冲
    
    setTimeout(() => {
        updateGameDisplay();
    }, narratorDelay);
}

// 获取AI选择
function getAIChoice(plot, characterType) {
    const history = getGameHistory();
    const aiChoices = characterType === 'male' ? history.maleChoices : history.femaleChoices;
    
    // 如果有历史记录，使用最后一次的选择
    if (aiChoices[plot]) {
        return aiChoices[plot];
    }
    
    // 否则使用默认配置
    const defaults = characterType === 'male' ? defaultAIChoices.male : defaultAIChoices.female;
    return defaults[plot] || null;
}

// 保存玩家选择到历史记录
function savePlayerChoice(plot, choiceId) {
    const history = getGameHistory();
    
    if (gameState.playerRole === 'male') {
        history.maleChoices[plot] = choiceId;
    } else {
        history.femaleChoices[plot] = choiceId;
    }
    
    saveGameHistory(history);
}

// 添加对话气泡
function addDialogueBubble(dialogue, type) {
    const dialogueBubbles = document.getElementById('dialogueBubbles');
    
    const bubble = document.createElement('div');
    bubble.className = `dialogue-bubble ${type}`;
    bubble.textContent = ''; // 初始为空，用于逐字显示
    
    // 将新气泡插入到容器顶部
    dialogueBubbles.insertBefore(bubble, dialogueBubbles.firstChild);
    
    // 限制气泡数量，避免过多气泡挤压
    manageBubbleCount(dialogueBubbles);
    
    // 触发出现动画
    setTimeout(() => {
        bubble.style.opacity = '1';
        
        // 开始逐字显示文字
        typewriterEffect(bubble, dialogue);
    }, 10);
    
    // 记录到历史
    gameState.dialogueHistory.push({
        dialogue: dialogue,
        type: type
    });
}

// 管理气泡数量，移除过多的旧气泡
function manageBubbleCount(container) {
    const maxBubbles = 3; // 最多显示3个气泡
    const bubbles = container.querySelectorAll('.dialogue-bubble:not(.waiting)');
    
    if (bubbles.length > maxBubbles) {
        // 从最后面开始移除多余的气泡（最旧的）
        for (let i = maxBubbles; i < bubbles.length; i++) {
            const oldBubble = bubbles[i];
            
            // 添加退出动画类
            oldBubble.classList.add('bubble-exit');
            
            // 动画完成后移除元素
            setTimeout(() => {
                if (oldBubble.parentNode) {
                    oldBubble.remove();
                }
            }, 500);
        }
    }
}

// 打字机效果函数
function typewriterEffect(element, text) {
    let index = 0;
    const speed = 80; // 每个字符显示的间隔时间（毫秒）
    
    // 创建光标元素
    const cursor = document.createElement('span');
    cursor.textContent = '|';
    cursor.className = 'typing-cursor';
    
    // 添加光标
    element.appendChild(cursor);
    
    function typeNextChar() {
        if (index < text.length) {
            // 在光标前插入新字符
            const textNode = document.createTextNode(text.charAt(index));
            element.insertBefore(textNode, cursor);
            index++;
            
            // 为了更好的视觉效果，标点符号后稍微停顿
            const currentChar = text.charAt(index - 1);
            const isPunctuation = /[，。！？；：、,\.\!\?;:]/.test(currentChar);
            const delay = isPunctuation ? speed * 1.5 : speed;
            
            setTimeout(typeNextChar, delay);
        } else {
            // 打字完成，移除光标
            cursor.remove();
        }
    }
    
    // 开始打字前稍微延迟
    setTimeout(typeNextChar, 200);
}

// 添加等待气泡
function addWaitingBubble(characterType) {
    const dialogueBubbles = document.getElementById('dialogueBubbles');
    
    const bubble = document.createElement('div');
    bubble.className = `dialogue-bubble ${characterType} waiting`;
    bubble.textContent = '';
    
    // 将等待气泡插入到容器顶部
    dialogueBubbles.insertBefore(bubble, dialogueBubbles.firstChild);
    
    // 保存引用以便后续移除
    gameState.waitingBubble = bubble;
    
    // 触发动画
    setTimeout(() => {
        bubble.style.opacity = '1';
        // 添加动态的点点点效果
        addWaitingDots(bubble);
    }, 10);
}

// 添加动态等待点效果
function addWaitingDots(element) {
    let dotCount = 0;
    const maxDots = 3;
    
    function animateDots() {
        dotCount = (dotCount + 1) % (maxDots + 1);
        element.textContent = '.'.repeat(dotCount);
        
        // 只有当气泡还存在时才继续动画
        if (element.parentNode) {
            setTimeout(animateDots, 500);
        }
    }
    
    animateDots();
}

// 移除等待气泡
function removeWaitingBubble() {
    if (gameState.waitingBubble) {
        gameState.waitingBubble.remove();
        gameState.waitingBubble = null;
    }
}

// 更新游戏显示
function updateGameDisplay() {
    const currentPlotData = gameData[gameState.currentPlot];
    
    if (!currentPlotData) {
        // 显示结局
        showEnding();
        return;
    }
    
    // 清空选择容器（只在显示新选项前清空）
    const choicesContainer = document.getElementById('choicesContainer');
    
    // 判断是否是玩家控制的角色
    const isPlayerTurn = currentPlotData.type === gameState.playerRole;
    
    if (isPlayerTurn) {
        // 清空并准备显示新选项
        choicesContainer.innerHTML = '';
        
        // 获取历史选择
        const history = getGameHistory();
        const playerChoices = gameState.playerRole === 'male' ? history.maleChoices : history.femaleChoices;
        const lastChoice = playerChoices[gameState.currentPlot];
        
        // 玩家回合：显示可选择的按钮
        currentPlotData.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = `choice-button ${currentPlotData.type}`;
            
            // 检查是否是上次选择的选项
            let buttonText = choice.text;
            if (lastChoice === choice.id) {
                buttonText += ' <span class="last-choice-mark">(上次选择)</span>';
            }
            
            button.innerHTML = buttonText;
            button.onclick = () => makeChoice(choice, true);
            choicesContainer.appendChild(button);
            
            // 触发入场动画，每个按钮有延迟
            setTimeout(() => {
                button.classList.add('show');
            }, index * 100 + 50);
        });
    } else {
        // AI回合：确保选择容器为空，显示等待气泡
        if (choicesContainer.innerHTML !== '') {
            choicesContainer.innerHTML = '';
        }
        
        addWaitingBubble(currentPlotData.type);
        
        const aiChoiceId = getAIChoice(gameState.currentPlot, currentPlotData.type);
        const aiChoice = currentPlotData.choices.find(c => c.id === aiChoiceId) || currentPlotData.choices[0];
        
        // 2秒后自动执行AI选择
        gameState.isWaitingForAuto = true;
        setTimeout(() => {
            if (gameState.isWaitingForAuto) {
                removeWaitingBubble();
                makeChoice(aiChoice, false);
            }
        }, 2000);
    }
    
    // 隐藏结局信息
    document.getElementById('endingMessage').classList.add('hidden');
}

// 做出选择
function makeChoice(choice, isPlayerChoice) {
    if (gameState.isWaitingForAuto && isPlayerChoice) {
        return; // 等待AI选择时不允许玩家操作
    }
    
    gameState.isWaitingForAuto = false;
    
    // 如果是玩家选择，立即隐藏所有选项按钮
    if (isPlayerChoice) {
        hideChoiceButtons();
    }
    
    // 记录选择
    gameState.choices.push({
        plot: gameState.currentPlot,
        choice: choice.id,
        text: choice.text,
        isPlayerChoice: isPlayerChoice
    });
    
    // 如果是玩家选择，保存到历史记录并记录解锁进度
    if (isPlayerChoice) {
        savePlayerChoice(gameState.currentPlot, choice.id);
        recordChoice(choice.id);
    }
    
    // 添加对话气泡
    const currentPlotData = gameData[gameState.currentPlot];
    const characterType = currentPlotData.type;
    
    addDialogueBubble(choice.dialogue, characterType);
    
    // 更新游戏状态
    gameState.currentPlot = choice.next;
    
    // 根据文字长度动态计算延迟时间，让用户完整看到打字效果
    const textLength = choice.dialogue.length;
    const typewriterDelay = textLength * 80 + 800; // 基于打字速度计算 + 额外800ms缓冲
    
    setTimeout(() => {
        updateGameDisplay();
    }, typewriterDelay);
}

// 隐藏选项按钮
function hideChoiceButtons() {
    const choicesContainer = document.getElementById('choicesContainer');
    const buttons = choicesContainer.querySelectorAll('.choice-button');
    
    buttons.forEach(button => {
        button.classList.add('hide');
    });
    
    // 动画完成后清空容器
    setTimeout(() => {
        choicesContainer.innerHTML = '';
    }, 300);
}

// 隐藏所有对话气泡
function hideAllBubbles() {
    const dialogueBubbles = document.getElementById('dialogueBubbles');
    const bubbles = dialogueBubbles.querySelectorAll('.dialogue-bubble');
    
    bubbles.forEach(bubble => {
        bubble.classList.add('bubble-exit');
    });
    
    // 清空对话容器
    setTimeout(() => {
        dialogueBubbles.innerHTML = '';
    }, 500);
}

// 显示结局
function showEnding() {
    const endingId = gameState.currentPlot;
    const ending = endings[endingId];
    
    if (!ending) {
        console.error('结局不存在:', endingId);
        return;
    }
    
    // 优雅地隐藏选择按钮
    const choicesContainer = document.getElementById('choicesContainer');
    const buttons = choicesContainer.querySelectorAll('.choice-button');
    if (buttons.length > 0) {
        hideChoiceButtons();
    } else {
        choicesContainer.innerHTML = '';
    }
    
    // 根据结局类型执行不同的动画
    if (ending.type === 'failed') {
        // 失败结局：先隐藏气泡，播放失败背景动画，然后显示结局窗口
        hideAllBubbles();
        
        setTimeout(() => {
            // 显示失败背景
            const backgroundFail = document.getElementById('backgroundFail');
            backgroundFail.classList.remove('hide');
            backgroundFail.classList.add('show');
            
            // 1秒后显示结局窗口
            setTimeout(() => {
                showEndingDialog(ending);
            }, 1000);
        }, 500);
    } else {
        // 完美结局：先隐藏气泡，然后直接显示结局窗口
        hideAllBubbles();
        
        setTimeout(() => {
            showEndingDialog(ending);
        }, 500);
    }
}

// 显示结局对话框
function showEndingDialog(ending) {
    // 检查角色选择是否已解锁
    const history = getGameHistory();
    const isUnlocked = history.characterSelectionUnlocked;
    
    // 构建弹窗内容
    let endingHTML = `
        <h2>${ending.title}</h2>
        <p>${ending.message}</p>
    `;
    
    // 如果是完美结局，添加结局图片
    if (ending.type === 'success') {
        endingHTML += `
            <img src="./img/img_end.png" alt="完美结局" class="ending-image">
        `;
    }
    
    // 如果有待显示的解锁消息，显示它
    if (gameState.pendingUnlockMessage) {
        endingHTML += `
            <div class="unlock-message">
                ${gameState.pendingUnlockMessage}
            </div>
        `;
        gameState.pendingUnlockMessage = null; // 清除消息
    }
    
    // 完美结局时不显示重新开始选项，作为游戏结束的标志
    if (ending.type !== 'success') {
        if (isUnlocked) {
            // 解锁后：显示角色选择UI，根据当前选择状态决定默认选中
            const maleSelected = selectedCharacterForRestart === 'male' ? 'selected' : '';
            const femaleSelected = selectedCharacterForRestart === 'female' ? 'selected' : '';
            
            endingHTML += `
                <div class="character-selection-inline">
                    <h3>选择角色重新开始：</h3>
                    <div class="character-options-inline">
                        <div class="character-option-inline male ${maleSelected}" onclick="toggleCharacterSelection('male')">
                            👨 男生
                        </div>
                        <div class="character-option-inline female ${femaleSelected}" onclick="toggleCharacterSelection('female')">
                            👩 女生
                        </div>
                    </div>
                    <button class="retry-button" onclick="startGameWithSelectedCharacter()">
                        再试一次
                    </button>
                </div>
            `;
        } else {
            // 未解锁：只显示再试一次按钮
            endingHTML += `
                <button class="retry-button" onclick="selectCharacter('male')">
                    再试一次
                </button>
            `;
        }
    }
    
    const endingMessage = document.getElementById('endingMessage');
    endingMessage.innerHTML = endingHTML;
    endingMessage.className = `ending-message ${ending.type}`;
    endingMessage.classList.remove('hidden');
    
    // 触发入场动画
    setTimeout(() => {
        endingMessage.classList.add('show');
    }, 50);
}

// 存储当前选择的角色（用于结局界面）
let selectedCharacterForRestart = 'female'; // 默认选择女生

// 切换角色选择
function toggleCharacterSelection(role) {
    selectedCharacterForRestart = role;
    
    // 更新选择状态
    const maleOption = document.querySelector('.character-option-inline.male');
    const femaleOption = document.querySelector('.character-option-inline.female');
    
    if (maleOption && femaleOption) {
        maleOption.classList.remove('selected');
        femaleOption.classList.remove('selected');
        
        if (role === 'male') {
            maleOption.classList.add('selected');
        } else {
            femaleOption.classList.add('selected');
        }
    }
}

// 使用选择的角色开始游戏
function startGameWithSelectedCharacter() {
    selectCharacter(selectedCharacterForRestart);
}

// 重新开始游戏
function restartGame() {
    // 检查角色选择是否已解锁，如果解锁则显示选择界面，否则直接开始男生游戏
    const history = getGameHistory();
    if (history.characterSelectionUnlocked) {
        showEnding(); // 复用结局界面作为选择界面
    } else {
        selectCharacter('male');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    const history = getGameHistory();
    
    // 如果是第一次游玩，标记不是第一次
    if (history.isFirstTime) {
        history.isFirstTime = false;
        saveGameHistory(history);
    }
    
    // 显示标题界面，不再自动开始游戏
    // 用户需要点击"开始游戏"按钮才会开始
}); 