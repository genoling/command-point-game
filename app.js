/**
 * ============================================================
 *  Command Point Game - 核心逻辑引擎
 * ============================================================
 * 
 * 🔧 模块职责：
 *   1. 全局状态管理与 Firebase 实时订阅
 *   2. 游戏规则引擎（打赌/贷款/指令/技能/AllIn）
 *   3. 安全策略中间件（角色密码、管理员验证）
 *   4. 撤销回滚系统（最多 3 步历史快照）
 *   5. UI 渲染层与事件派发
 * 
 * 📦 版本：V3.5.3
 * 👤 项目：博弈论：律政与代码
 * ============================================================
 */

/* ----------------------------------------------------------------
 * 全局状态变量
 * -------------------------------------------------------------- */
let currentRoom = null;       // 当前房间 ID
let myRole = null;            // 本端选择的角色：'lawyer' | 'coder' | null
let currentDbState = null;    // 实时数据库状态快照
let pendingCallback = null;   // 密码验证成功后的待执行回调
let allInRequestActive = false; // AllIn 请求状态标记

const DEFAULT_ADMIN_PWD = "8868"; // 默认管理员密码（首次创建房间时使用）

/* ----------------------------------------------------------------
 * 初始化入口
 * -------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', () => {
    initRoom();
    // 技能冷却定时器（每秒刷新 UI）
    setInterval(updateCooldownUI, 1000);
});

/* ----------------------------------------------------------------
 * 房间路由与同步初始化
 * -------------------------------------------------------------- */

/**
 * 从 URL 参数解析房间号，若无则弹出创建对话框
 */
function initRoom() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
        currentRoom = decodeURIComponent(roomParam);
        document.getElementById('room-display').innerText = `房间: ${currentRoom}`;
        startRoomSync();
    } else {
        openModal('room-init-modal');
    }
}

/**
 * 建立 Firebase 实时监听，挂载状态机
 */
function startRoomSync() {
    // 离线降级模式
    if (!db) {
        const statusEl = document.getElementById('conn-status');
        statusEl.className = "flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded border border-red-200";
        document.getElementById('room-display').innerText = "离线沙箱状态";
        setupMockOfflineState();
        return;
    }

    const roomRef = db.ref('rooms/' + currentRoom);
    roomRef.on('value', (snapshot) => {
        const state = snapshot.val();
        if (!state) {
            // 房间不存在，初始化默认数据结构
            initDatabaseStructure();
        } else {
            currentDbState = state;
            renderUI();
        }
        // 更新连接指示状态
        const statusEl = document.getElementById('conn-status');
        statusEl.className = "flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200";
        const indicator = statusEl.querySelector('span:first-child');
        if (indicator) indicator.className = "w-1.5 h-1.5 rounded-full bg-emerald-500";
    }, (error) => {
        console.error("数据库订阅读写受阻：", error);
    });
}

/**
 * 写入初始房间数据结构
 */
function initDatabaseStructure() {
    if (!currentRoom) return;
    const defaultState = {
        meta:  { turn: 'lawyer', undoCount: 3, adminPwd: DEFAULT_ADMIN_PWD },
        lawyer: { cp: 0, pwd: "", skillCooldown: 0 },
        coder:  { cp: 0, pwd: "", skillCooldown: 0 },
        todos: {},
        logs: ["🎉 新一局博弈对决开启！"],
        history: []
    };
    if (db) {
        db.ref('rooms/' + currentRoom).set(defaultState);
    } else {
        currentDbState = defaultState;
        renderUI();
    }
}

/**
 * 离线沙箱模式：本地模拟一份状态
 */
function setupMockOfflineState() {
    initDatabaseStructure();
}

/* ----------------------------------------------------------------
 * UI 渲染引擎
 * -------------------------------------------------------------- */

/**
 * 总渲染入口：根据 currentDbState 同步刷新所有 UI 元素
 */
function renderUI() {
    if (!currentDbState) return;

    // 1. CP 点数
    document.getElementById('cp-lawyer').innerText = currentDbState.lawyer.cp;
    document.getElementById('cp-coder').innerText = currentDbState.coder.cp;

    // 2. 回合指示与撤销计数
    document.getElementById('turn-badge').innerText = currentDbState.meta.turn === 'lawyer' ? '律师' : '程序员';
    document.getElementById('undo-count').innerText = currentDbState.meta.undoCount;

    // 3. 角色密码状态渲染（置灰 + 禁用）
    renderPasswordStatus('lawyer', 'blue');
    renderPasswordStatus('coder', 'emerald');

    // 4. 角色选中高亮状态
    renderRoleSelectionUI();

    // 5. 待办列表
    renderTodos();

    // 6. 战斗日志
    renderLogs();

    // 7. AllIn 弹窗监听
    handleAllInCheck();
}

/**
 * 渲染单角色密码状态
 */
function renderPasswordStatus(role, color) {
    const pStateEl = document.getElementById(`pwd-state-${role}`);
    const btnEl = document.getElementById(`set-pwd-${role}-btn`);
    const hasPwd = !!currentDbState[role].pwd;

    if (hasPwd) {
        pStateEl.innerText = "🔐 密码已锁定";
        btnEl.disabled = true;
        btnEl.className = "text-[10px] text-slate-400 cursor-not-allowed flex items-center gap-0.5 mt-0.5";
    } else {
        pStateEl.innerText = "设置操作密码";
        btnEl.disabled = false;
        btnEl.className = `text-[10px] text-${color}-600 hover:underline flex items-center gap-0.5 mt-0.5`;
    }
}

/**
 * 渲染角色卡片选中态（替代原巨型水印方案）
 */
function renderRoleSelectionUI() {
    const cardLawyer = document.getElementById('role-box-lawyer');
    const cardCoder = document.getElementById('role-box-coder');
    const btnLawyer = document.getElementById('role-select-lawyer');
    const btnCoder = document.getElementById('role-select-coder');

    // 清除之前的高亮类
    cardLawyer.classList.remove('active-lawyer-border');
    cardCoder.classList.remove('active-coder-border');

    if (myRole === 'lawyer') {
        cardLawyer.classList.add('active-lawyer-border');
        btnLawyer.innerText = "⭐ 我是律师";
        btnLawyer.className = "bg-blue-600 text-white text-xs px-2.5 py-1 rounded-lg shadow-sm font-semibold";
        btnCoder.innerText = "选择我是程序员";
        btnCoder.className = "bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-200 transition";
    } else if (myRole === 'coder') {
        cardCoder.classList.add('active-coder-border');
        btnCoder.innerText = "⭐ 我是程序员";
        btnCoder.className = "bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-lg shadow-sm font-semibold";
        btnLawyer.innerText = "选择我是律师";
        btnLawyer.className = "bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-200 transition";
    }
}

/**
 * 渲染待执行命令列表
 */
function renderTodos() {
    const list = document.getElementById('todo-list');
    list.innerHTML = "";
    const todos = currentDbState.todos || {};
    const keys = Object.keys(todos);

    document.getElementById('todo-count').innerText = keys.length;

    if (keys.length === 0) {
        list.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">暂无待执行命令</p>`;
        return;
    }

    keys.forEach(id => {
        const item = todos[id];
        const isMyTask = (item.type === "loan" && item.creator === myRole)
                      || (item.type === "normal" && item.creator !== myRole);
        const card = document.createElement('div');
        card.className = `p-3 rounded-lg border text-xs flex justify-between items-center transition ${
            isMyTask ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-200'
        }`;

        const badge = item.type === "loan"
            ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold mr-1">抵押贷款</span>`
            : `<span class="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded font-bold mr-1">${item.level}级</span>`;
        const roleIcon = item.creator === 'lawyer' ? '👨‍⚖️' : '👨‍💻';
        const targetText = item.type === "loan" ? '自己' : '对方';

        card.innerHTML = `
            <div>
                <div class="flex items-center gap-1 mb-1">
                    ${badge}
                    <span class="text-[11px] text-slate-500">${roleIcon} 下达给 ${targetText}</span>
                </div>
                <p class="font-bold text-slate-800">${item.text}</p>
            </div>
            <button onclick="completeTask('${id}')" class="bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 font-semibold px-3 py-1 rounded shadow-sm transition">
                确认完成
            </button>
        `;
        list.appendChild(card);
    });
}

/**
 * 渲染战斗日志
 */
function renderLogs() {
    const container = document.getElementById('logs-container');
    container.innerHTML = "";
    const logs = currentDbState.logs || [];
    if (logs.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">暂无战斗数据</p>`;
        return;
    }
    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = "text-[11px] py-1 border-b border-slate-50 text-slate-500 leading-relaxed";
        item.innerText = log;
        container.appendChild(item);
    });
    container.scrollTop = container.scrollHeight;
}

/**
 * 每秒驱动技能冷却进度条
 */
function updateCooldownUI() {
    if (!currentDbState) return;
    const now = Date.now();

    ['lawyer', 'coder'].forEach(role => {
        const container = document.getElementById(`cooldown-container-${role}`);
        const btn = document.getElementById(`skill-${role}-btn`);
        const cd = currentDbState[role].skillCooldown || 0;
        const color = role === 'lawyer' ? 'blue' : 'emerald';

        if (cd > now) {
            // 冷却中
            container.classList.remove('hidden');
            btn.disabled = true;
            btn.className = "bg-slate-200 text-slate-400 font-medium text-[11px] px-2.5 py-0.5 rounded shadow-sm cursor-not-allowed";

            const diff = cd - now;
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

            document.getElementById(`cooldown-time-${role}`).innerText = `${h}:${m}:${s}`;
            document.getElementById(`cooldown-bar-${role}`).style.width = `${(diff / 86400000) * 100}%`;
        } else {
            // 可用状态
            container.classList.add('hidden');
            btn.disabled = false;
            btn.className = `bg-${color}-600 hover:bg-${color}-500 text-white font-medium text-[11px] px-2.5 py-0.5 rounded shadow-sm transition`;
        }
    });
}

/* ----------------------------------------------------------------
 * 安全策略中间件
 * -------------------------------------------------------------- */

/**
 * 角色操作安全守卫
 * - 未选角色拦截
 * - 越权操作拦截（不能用对方技能）
 * - 密码二次校验拦截
 * @param {string} role - 目标角色
 * @param {Function} callback - 验证通过后执行的回调
 */
function secureAction(role, callback) {
    if (!myRole) {
        return alert("⚠️ 错误：您尚未选择自己在当前设备下的游戏阵营，请先点击角色头像右侧的「选择我是...」");
    }
    if (myRole !== role) {
        return alert("⚠️ 错误：您无法代行发动对方角色的专属操作！");
    }
    const rolePwd = currentDbState[role].pwd;
    if (rolePwd) {
        pendingCallback = callback;
        openModal('role-auth-modal');
    } else {
        callback();
    }
}

/**
 * 提交角色密码验证
 */
function submitRoleAuth() {
    const input = document.getElementById('role-pwd-auth-input');
    const pwd = input.value;
    if (!pwd) return alert("请输入操作密码进行校验。");

    const correct = currentDbState[myRole].pwd;
    if (pwd === correct) {
        closeModal('role-auth-modal');
        input.value = "";
        if (pendingCallback) {
            const cb = pendingCallback;
            pendingCallback = null;
            cb();
        }
    } else {
        alert("❌ 验证未通过：您输入的操作校验码不匹配！");
    }
}

/* ----------------------------------------------------------------
 * 角色选择
 * -------------------------------------------------------------- */
function selectRole(role) {
    myRole = role;
    renderUI();
}

/* ----------------------------------------------------------------
 * 数据库提交层（带历史快照与日志）
 * -------------------------------------------------------------- */

/**
 * 提交状态变更到数据库
 * - 自动追加战斗日志
 * - 自动保存历史快照用于撤销
 * @param {Object} newState - 变更字段
 * @param {string} [logMessage] - 战斗日志文本
 */
function commitUpdate(newState, logMessage) {
    // 追加日志
    if (logMessage) {
        const logs = currentDbState.logs ? [...currentDbState.logs] : [];
        const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        logs.push(`[${time}] ${logMessage}`);
        newState.logs = logs;
    }

    // 保存上一步状态用于回滚
    const snapshot = JSON.stringify({
        lawyer:  { ...currentDbState.lawyer },
        coder:   { ...currentDbState.coder },
        todos:   { ...(currentDbState.todos || {}) },
        meta:    { ...currentDbState.meta }
    });
    const history = currentDbState.history ? [...currentDbState.history, snapshot] : [snapshot];
    if (history.length > 3) history.shift();
    newState.history = history;

    if (db) {
        db.ref('rooms/' + currentRoom).update(newState);
    } else {
        // 本地沙箱模式：直接合并状态并重绘
        currentDbState = { ...currentDbState, ...newState };
        renderUI();
    }
}

/* ----------------------------------------------------------------
 * 游戏规则：赢打赌
 * -------------------------------------------------------------- */
function openBetModal() {
    if (!myRole) return alert("请先选择您的操作角色。");
    openModal('bet-modal');
}

function submitBet() {
    const text = document.getElementById('bet-text').value.trim();
    if (!text) return alert("打赌约定内容不得为空！");

    secureAction(myRole, () => {
        const updater = {};
        updater[`${myRole}/cp`] = currentDbState[myRole].cp + 1;
        updater[`meta/turn`] = myRole === 'lawyer' ? 'coder' : 'lawyer';
        const roleName = myRole === 'lawyer' ? '律师' : '程序员';
        commitUpdate(updater, `🏆 ${roleName} 赢得了打赌：【${text}】，获得 +1 CP`);
        closeModal('bet-modal');
        document.getElementById('bet-text').value = "";
    });
}

/* ----------------------------------------------------------------
 * 游戏规则：下达命令
 * -------------------------------------------------------------- */
function dispatchCommand() {
    if (!myRole) return alert("请先选择您的操作角色。");
    const text = document.getElementById('cmd-text').value.trim();
    if (!text) return alert("指令详情不得为空！");

    const level = parseInt(document.querySelector('input[name="cmd-lv"]:checked').value);
    const cpCosts = { 1: 1, 2: 2, 3: 4 };
    const cost = cpCosts[level];

    if (currentDbState[myRole].cp < cost) {
        return alert(`❌ 操作失败：您的 CP 剩余量不足，下达当前级别的指令需要拥有并消耗 ${cost} CP！`);
    }

    secureAction(myRole, () => {
        const taskId = 'task_' + Date.now();
        const updater = {};
        updater[`${myRole}/cp`] = currentDbState[myRole].cp - cost;
        updater[`todos/${taskId}`] = {
            id: taskId,
            type: "normal",
            level: level,
            creator: myRole,
            text: text,
            cost: cost
        };
        const roleName = myRole === 'lawyer' ? '律师' : '程序员';
        commitUpdate(updater, `📝 ${roleName} 消耗 ${cost} CP，向对方下达了 ${level}级 惩罚命令：【${text}】`);
        document.getElementById('cmd-text').value = "";
    });
}

/* ----------------------------------------------------------------
 * 游戏规则：银行贷款
 * -------------------------------------------------------------- */
function openLoanModal() {
    if (!myRole) return alert("请先选择您的操作角色。");
    openModal('loan-modal');
}

function submitLoan() {
    const text = document.getElementById('loan-text').value.trim();
    if (!text) return alert("抵押惩罚条款内容不得为空。");
    const level = parseInt(document.querySelector('input[name="loan-lv"]:checked').value);
    const cpGains = { 1: 1, 2: 2, 3: 4 };
    const gain = cpGains[level];

    secureAction(myRole, () => {
        const taskId = 'loan_' + Date.now();
        const updater = {};
        updater[`${myRole}/cp`] = currentDbState[myRole].cp + gain;
        updater[`todos/${taskId}`] = {
            id: taskId,
            type: "loan",
            creator: myRole,
            text: text,
            gain: gain
        };
        const roleName = myRole === 'lawyer' ? '律师' : '程序员';
        commitUpdate(updater, `🏦 ${roleName} 向银行成功抵押贷款 ${gain} CP，当即背负生成自身待办项：【${text}】`);
        closeModal('loan-modal');
        document.getElementById('loan-text').value = "";
    });
}

/* ----------------------------------------------------------------
 * 游戏规则：完成任务
 * -------------------------------------------------------------- */
function completeTask(id) {
    if (!myRole) return alert("请先选择操作角色。");
    const task = currentDbState.todos?.[id];
    if (!task) return;

    // 权限校验：普通命令由接收方确认；贷款命令由发放方（对方）确认贷款方完成
    const confirmer = task.type === 'loan'
        ? (task.creator === 'lawyer' ? 'coder' : 'lawyer')  // 对方确认你完成了
        : (task.creator === 'lawyer' ? 'coder' : 'lawyer'); // 接收方确认完成

    if (myRole !== confirmer) {
        const confirmerName = confirmer === 'lawyer' ? '律师' : '程序员';
        return alert(`⚠️ 权限不足：该任务需要由【${confirmerName}】这一端确认现实中已履行后才可在此销账！`);
    }

    const updater = { [`todos/${id}`]: null };
    const roleName = myRole === 'lawyer' ? '律师' : '程序员';
    commitUpdate(updater, `✅ ${roleName} 确认对方在现实中完成了指令：【${task.text}】`);
}

/* ----------------------------------------------------------------
 * 全局撤销系统
 * -------------------------------------------------------------- */
function triggerUndo() {
    const curUndo = currentDbState.meta.undoCount;
    if (curUndo <= 0) return alert("❌ 无法撤销：当前对局的撤销次数（3/3）已全部消耗完毕。");

    const historyList = currentDbState.history || [];
    if (historyList.length === 0) return alert("无可用于撤销的历史痕迹状态。");

    const prevRaw = historyList.pop();
    const prev = JSON.parse(prevRaw);

    if (db) {
        db.ref('rooms/' + currentRoom).update({
            lawyer: prev.lawyer,
            coder: prev.coder,
            todos: prev.todos,
            'meta/undoCount': curUndo - 1,
            history: historyList
        });
    } else {
        currentDbState.lawyer = prev.lawyer;
        currentDbState.coder = prev.coder;
        currentDbState.todos = prev.todos;
        currentDbState.meta.undoCount = curUndo - 1;
        currentDbState.history = historyList;
        renderUI();
    }
}

/* ----------------------------------------------------------------
 * 专属技能：律师 - 律师函警告
 * -------------------------------------------------------------- */
function useLawyerSkill() {
    secureAction('lawyer', () => {
        const now = Date.now();
        if (currentDbState.lawyer.skillCooldown > now) {
            return alert("技能仍在冷却中，无法重复发动。");
        }

        const todos = currentDbState.todos || {};
        const keys = Object.keys(todos).filter(k =>
            todos[k].type === 'normal' && todos[k].creator === 'coder'
        );
        if (keys.length === 0) return alert("❌ 对方暂未下达待办命令，无法发动律师函。");

        // 撤销最新一条（按 ID 时间戳排序）
        const targetId = keys.sort().pop();
        const target = todos[targetId];

        const updater = {};
        updater[`todos/${targetId}`] = null;
        updater[`coder/cp`] = currentDbState.coder.cp + target.cost;
        updater[`lawyer/skillCooldown`] = now + 86400000; // 24h 冷却

        commitUpdate(updater,
            `🛡️ 律师发动专属技能【律师函警告】！强行废止程序员最新指令【${target.text}】，全额退还 ${target.cost} CP`);
    });
}

/* ----------------------------------------------------------------
 * 专属技能：程序员 - 致命 Bug
 * -------------------------------------------------------------- */
function useCoderSkill() {
    secureAction('coder', () => {
        const now = Date.now();
        if (currentDbState.coder.skillCooldown > now) {
            return alert("技能仍在冷却中，无法重复发动。");
        }

        const victimCp = currentDbState.lawyer.cp;
        const loss = Math.ceil(victimCp * 0.3) || 1;  // 最少扣 1 CP
        const newCp = Math.max(0, victimCp - loss);

        const updater = {};
        updater[`lawyer/cp`] = newCp;
        updater[`coder/skillCooldown`] = now + 86400000; // 24h 冷却

        commitUpdate(updater,
            `⚡ 程序员发动专属技能【致命Bug】！扣除律师 30% (${loss}点) CP，从 ${victimCp} → ${newCp}`);
    });
}

/* ----------------------------------------------------------------
 * AllIn 通吃机制
 * -------------------------------------------------------------- */
function triggerAllIn() {
    if (!myRole) return alert("请选择操作角色。");
    if (currentDbState[myRole].cp <= 0) return alert("您的点数归零无法进行 All In 豪赌！");

    secureAction(myRole, () => {
        const updater = {};
        updater[`meta/allinState`] = {
            origin: myRole,
            value: currentDbState[myRole].cp,
            timestamp: Date.now()
        };
        const roleName = myRole === 'lawyer' ? '律师' : '程序员';
        commitUpdate(updater, `🔥 ${roleName} 自废全部 CP，孤注一掷申请 All In 点数通吃转移...`);
    });
}

/**
 * 监听 AllIn 请求并弹出确认框
 */
function handleAllInCheck() {
    const ai = currentDbState.meta.allinState;
    if (ai && ai.origin !== myRole && !allInRequestActive) {
        allInRequestActive = true;
        const originName = ai.origin === 'lawyer' ? '律师' : '程序员';
        document.getElementById('allin-confirm-msg').innerText =
            `${originName}已自毁扣除了其身上的全部 ${ai.value} CP。\n您是否接受这一对赌转移？\n确认后您将掠夺 ${ai.value} CP，但承认了对方的豪赌勇气！`;
        openModal('allin-confirm-modal');
    }
    if (!ai && allInRequestActive) {
        // 状态被清空，关闭弹窗
        closeModal('allin-confirm-modal');
        allInRequestActive = false;
    }
}

function acceptAllIn() {
    const ai = currentDbState.meta.allinState;
    if (!ai) return;

    const updater = {};
    updater[`${ai.origin}/cp`] = 0;  // 发起方归零
    updater[`${myRole}/cp`] = currentDbState[myRole].cp + ai.value; // 接收方掠夺
    updater[`meta/allinState`] = null;

    const myName = myRole === 'lawyer' ? '律师' : '程序员';
    const originName = ai.origin === 'lawyer' ? '律师' : '程序员';
    commitUpdate(updater,
        `💥 AllIn 通吃生效！${myName} 同意对赌并成功掠夺 ${originName} 的 ${ai.value} CP，${originName} 点数归零！`);
    closeModal('allin-confirm-modal');
    allInRequestActive = false;
}

function rejectAllIn() {
    const updater = { 'meta/allinState': null };
    commitUpdate(updater, `All In 对赌被拒绝，挑战作废。`);
    closeModal('allin-confirm-modal');
    allInRequestActive = false;
}

/* ----------------------------------------------------------------
 * 角色密码管理
 * -------------------------------------------------------------- */
let setPwdRoleTarget = null;

function openSetPasswordModal(role) {
    if (currentDbState[role].pwd) return alert("该角色密码已设置并锁定，如需修改请联系管理员。");
    setPwdRoleTarget = role;
    openModal('set-pwd-modal');
}

function submitSetPassword() {
    const val = document.getElementById('set-pwd-input').value.trim();
    if (!val) return alert("密码不得为空。");
    const updater = {};
    updater[`${setPwdRoleTarget}/pwd`] = val;
    const roleName = setPwdRoleTarget === 'lawyer' ? '律师' : '程序员';
    commitUpdate(updater, `🔐 ${roleName} 独立操作密码设置成功，一次性生效锁定。`);
    closeModal('set-pwd-modal');
    document.getElementById('set-pwd-input').value = "";
    setPwdRoleTarget = null;
}

/* ----------------------------------------------------------------
 * 管理员系统
 * -------------------------------------------------------------- */
function reqAdminAccess() {
    openModal('admin-auth-modal');
}

function submitAdminAuth() {
    const input = document.getElementById('admin-pwd-input');
    const pwd = input.value;
    const targetPwd = currentDbState?.meta?.adminPwd || DEFAULT_ADMIN_PWD;

    if (pwd === targetPwd) {
        closeModal('admin-auth-modal');
        input.value = "";
        openModal('admin-panel-modal');
        loadAdminRoomList();
    } else {
        alert("❌ 验证未通过：管理员密码错误！");
    }
}

/**
 * 载入房间列表（管理员级）
 */
function loadAdminRoomList() {
    if (!db) return;
    db.ref('rooms').once('value', (snapshot) => {
        const rooms = snapshot.val() || {};
        const tbody = document.getElementById('admin-room-list');
        tbody.innerHTML = "";
        Object.keys(rooms).forEach(rk => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-slate-100 hover:bg-slate-50";
            tr.innerHTML = `
                <td class="p-2 text-center"><input type="checkbox" name="room-del-check" value="${rk}"></td>
                <td class="p-2 font-mono text-slate-800">${rk}</td>
                <td class="p-2 text-right text-emerald-600">Active</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function toggleSelectAllRooms(master) {
    const checks = document.getElementsByName('room-del-check');
    checks.forEach(c => c.checked = master.checked);
}

function deleteSelectedRooms() {
    if (!confirm("⚠️ 该操作无法挽回，是否确认删除勾选的所有对战房间数据？")) return;
    const checks = document.getElementsByName('room-del-check');
    const promises = [];
    checks.forEach(c => {
        if (c.checked && db) {
            promises.push(db.ref('rooms/' + c.value).remove());
        }
    });
    Promise.all(promises).then(() => {
        alert("✔ 批量清除彻底成功！");
        loadAdminRoomList();
    });
}

function createNewRoom() {
    const name = prompt("请输入你想创建的新对战房间号：");
    if (!name) return;
    db.ref('rooms/' + name).set({
        meta: { turn: 'lawyer', undoCount: 3, adminPwd: DEFAULT_ADMIN_PWD },
        lawyer: { cp: 0, pwd: "", skillCooldown: 0 },
        coder: { cp: 0, pwd: "", skillCooldown: 0 },
        todos: {},
        logs: ["🎉 对决开始建立！"]
    }).then(() => {
        alert("房间创建成功！");
        loadAdminRoomList();
    });
}

function resetCurrentRoomData() {
    if (confirm("🔄 确定要清除当前房间的所有进度、还原为 0 CP 并重设所有指令吗？")) {
        initDatabaseStructure();
        closeModal('admin-panel-modal');
    }
}

function submitChangeAdminPassword() {
    const val = document.getElementById('new-admin-pwd').value.trim();
    if (!val) return alert("新密码不得为空。");
    commitUpdate({ 'meta/adminPwd': val }, `【安全日志】管理员更新修改了本房间的后台密码。`);
    document.getElementById('new-admin-pwd').value = "";
    alert("密码更新成功！");
}

function adminSetRolePwd(role) {
    const val = document.getElementById(`admin-${role}-pwd`).value.trim();
    if (!val) return alert("请先录入字符。");
    const updater = { [`${role}/pwd`]: val };
    const roleName = role === 'lawyer' ? '律师' : '程序员';
    commitUpdate(updater, `【管理干预】管理员重置修改了 ${roleName} 角色的独立密码。`);
    document.getElementById(`admin-${role}-pwd`).value = "";
    alert("修改成功！");
}

function adminResetRolePwd(role) {
    if (!confirm("确定清除该角色的密码保护吗？")) return;
    const updater = { [`${role}/pwd`]: "" };
    const roleName = role === 'lawyer' ? '律师' : '程序员';
    commitUpdate(updater, `【管理干预】管理员清除释放了 ${roleName} 角色的独立密码。`);
    alert("该角色密码已被完全清除释放。");
}

/* ----------------------------------------------------------------
 * 数据导入导出
 * -------------------------------------------------------------- */
function openExportModal() {
    if (!currentDbState) return;
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(currentDbState))));
    document.getElementById('export-area').value = b64;
    openModal('export-modal');
}

function copyExportedText() {
    const text = document.getElementById('export-area');
    text.select();
    document.execCommand('copy');
    alert("✔ 数据加密文本已复制至剪贴板，妥善保存它即可随时恢复进度！");
}

function openImportModal() {
    openModal('import-modal');
}

function submitImportData() {
    const raw = document.getElementById('import-area').value.trim();
    if (!raw) return alert("请输入数据文本。");
    try {
        const json = JSON.parse(decodeURIComponent(escape(atob(raw))));
        if (db) {
            db.ref('rooms/' + currentRoom).set(json).then(() => {
                alert("✔ 覆盖导入并同步成功！");
                closeModal('import-modal');
            });
        } else {
            currentDbState = json;
            renderUI();
            alert("✔ 覆盖导入离线沙箱数据成功！");
            closeModal('import-modal');
        }
    } catch (e) {
        alert("❌ 失败：数据格式存在破损或版本不兼容！");
    }
}

/* ----------------------------------------------------------------
 * 通用 UI 辅助函数
 * -------------------------------------------------------------- */
function submitRoomInit() {
    const room = document.getElementById('room-id-input').value.trim();
    if (!room) return alert("房间号未填！");
    window.location.search = `?room=${encodeURIComponent(room)}`;
}

function generateRandomRoom() {
    const rand = Math.floor(100000 + Math.random() * 900000);
    window.location.search = `?room=${rand}`;
}

function copyRoomLink() {
    navigator.clipboard.writeText(window.location.href);
    alert("🔗 房间实时对战邀请链接已复制！发送给你的对手加入博弈吧。");
}

function toggleRules() {
    const panel = document.getElementById('rules-panel');
    const txt = document.getElementById('rule-btn-txt');
    const arr = document.getElementById('rule-btn-arrow');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        txt.innerText = "📖 收起规则";
        arr.className = "fa-solid fa-chevron-up text-[10px]";
    } else {
        panel.classList.add('hidden');
        txt.innerText = "📖 游戏规则";
        arr.className = "fa-solid fa-chevron-down text-[10px]";
    }
}

function openRoomModal() { openModal('room-init-modal'); }
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }