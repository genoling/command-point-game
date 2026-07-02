/**
 * ============================================================
 *  Firebase Realtime Database 配置文件
 * ============================================================
 * 
 * 🔧 模块职责：
 *   1. 封装 Firebase SDK 初始化流程
 *   2. 提供全局数据库实例 db
 *   3. 启动连接看门狗，异常时自动降级为本地沙箱模式
 * 
 * 📦 版本：V3.5.3
 * 👤 项目：Command Point Game - 博弈论：律政与代码
 * ============================================================
 */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBZi0WCRGTwuT5MFKkk5dU3gUvIKXVA0V0",
    authDomain: "command-point-2217e.firebaseapp.com",
    databaseURL: "https://command-point-2217e-default-rtdb.firebaseio.com",
    projectId: "command-point-2217e",
    storageBucket: "command-point-2217e.firebasestorage.app",
    messagingSenderId: "257939353713",
    appId: "1:257939353713:web:415584060618a41a342bd0",
    measurementId: "G-0EDVJ8R0HY"
};

/**
 * 全局数据库实例
 * 注意：若初始化失败，db 将保持为 null，app.js 中的状态机会自动
 * 降级到「离线沙箱模式」，确保前端 UI 仍可正常交互调试。
 * @type {firebase.database.Database | null}
 */
let db = null;

try {
    if (firebaseConfig.databaseURL && firebaseConfig.databaseURL.startsWith("https://")) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        console.log("%c✔ Firebase 实时对战数据引擎初始化成功！", "color:#10b981;font-weight:bold;");
    } else {
        console.warn("%c⚠️ Firebase 配置信息不完整，当前将启动离线本端调试沙箱状态机，数据将不会被同步至云端。", "color:#f59e0b;font-weight:bold;");
    }
} catch (e) {
    console.error("%c❌ Firebase 初始化发生严重未知异常：", "color:#ef4444;font-weight:bold;", e);
    console.warn("%c已自动降级为本地沙箱模式，请检查 config.js 中的配置参数。", "color:#f59e0b;");
}