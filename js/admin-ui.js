/**
 * Admin UI 處理模組
 * 負責用戶界面的互動和視覺效果
 */

/**
 * 自訂對話框系統
 * 取代原生的 alert 和 confirm
 */
class CustomDialog {
    /**
     * 顯示自訂 Alert 對話框
     */
    static async showAlert(message, type = 'info', options = {}) {
        return new Promise((resolve) => {
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            
            // 檢查是否有儲存的「不再提醒」設定
            const alertKey = options.rememberKey;
            if (alertKey && localStorage.getItem(`dontShow_${alertKey}`) === 'true') {
                resolve({ confirmed: true, dontShowAgain: true });
                return;
            }
            
            const overlay = document.createElement('div');
            overlay.className = 'custom-dialog-overlay';
            
            const rememberCheckbox = options.showDontRemind ? `
                <div class="custom-dialog-remember">
                    <label>
                        <input type="checkbox" id="dontShowAgain"> 不再提醒
                    </label>
                </div>
            ` : '';
            
            overlay.innerHTML = `
                <div class="custom-dialog">
                    <div class="custom-dialog-icon ${type}">${icons[type] || icons.info}</div>
                    <div class="custom-dialog-message">${message}</div>
                    ${rememberCheckbox}
                    <div class="custom-dialog-buttons">
                        <button class="custom-dialog-button primary">確定</button>
                    </div>
                </div>
            `;
            
            // 設定確定按鈕事件
            overlay.querySelector('.custom-dialog-button').onclick = function() {
                const dontShowAgain = overlay.querySelector('#dontShowAgain')?.checked || false;
                
                // 如果選擇「不再提醒」，儲存到 localStorage
                if (dontShowAgain && alertKey) {
                    localStorage.setItem(`dontShow_${alertKey}`, 'true');
                }
                
                overlay.remove();
                resolve({ confirmed: true, dontShowAgain });
            };
            
            // 支援 ESC 鍵關閉
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    resolve({ confirmed: true, dontShowAgain: false });
                }
            });
            
            // 點擊背景關閉
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve({ confirmed: true, dontShowAgain: false });
                }
            });
            
            document.body.appendChild(overlay);
            
            // 自動聚焦到按鈕
            setTimeout(() => {
                overlay.querySelector('.custom-dialog-button').focus();
            }, 100);
        });
    }
    
    /**
     * 顯示自訂 Confirm 對話框
     */
    static async showConfirm(message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'custom-dialog-overlay';
            
            overlay.innerHTML = `
                <div class="custom-dialog">
                    <div class="custom-dialog-icon info">❓</div>
                    <div class="custom-dialog-message">${message}</div>
                    <div class="custom-dialog-buttons">
                        <button class="custom-dialog-button secondary cancel-btn">取消</button>
                        <button class="custom-dialog-button primary confirm-btn">確定</button>
                    </div>
                </div>
            `;
            
            // 設定按鈕事件
            overlay.querySelector('.cancel-btn').onclick = function() {
                overlay.remove();
                resolve(false);
            };
            
            overlay.querySelector('.confirm-btn').onclick = function() {
                overlay.remove();
                resolve(true);
            };
            
            // 支援 ESC 鍵取消
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    resolve(false);
                } else if (e.key === 'Enter') {
                    overlay.remove();
                    resolve(true);
                }
            });
            
            // 點擊背景取消
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });
            
            document.body.appendChild(overlay);
            
            // 自動聚焦到確定按鈕
            setTimeout(() => {
                overlay.querySelector('.confirm-btn').focus();
            }, 100);
        });
    }
}

/**
 * 完成度指示器
 */
class CompletionIndicator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="completion-indicator">
                <div class="completion-text">比賽完成度: <span class="completion-percentage">0%</span></div>
                <div class="completion-bar">
                    <div class="completion-fill" style="width: 0%"></div>
                </div>
                <div class="completion-details">
                    <span class="completed-count">0</span> / <span class="total-count">64</span> 項目完成
                </div>
            </div>
        `;
    }
    
    update(completedItems, totalItems) {
        if (!this.container) return;
        
        const percentage = Math.round((completedItems / totalItems) * 100);
        
        const percentageEl = this.container.querySelector('.completion-percentage');
        const fillEl = this.container.querySelector('.completion-fill');
        const completedEl = this.container.querySelector('.completed-count');
        const totalEl = this.container.querySelector('.total-count');
        
        if (percentageEl) percentageEl.textContent = `${percentage}%`;
        if (fillEl) fillEl.style.width = `${percentage}%`;
        if (completedEl) completedEl.textContent = completedItems;
        if (totalEl) totalEl.textContent = totalItems;
        
        // 根據完成度改變顏色
        if (fillEl) {
            if (percentage >= 100) {
                fillEl.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
            } else if (percentage >= 75) {
                fillEl.style.background = 'linear-gradient(90deg, #ffc107, #fd7e14)';
            } else {
                fillEl.style.background = 'linear-gradient(90deg, #dc3545, #e83e8c)';
            }
        }
    }
}

/**
 * 狀態管理器
 * 管理頁面的各種狀態和視覺反饋
 */
class StateManager {
    constructor() {
        this.hasUnsavedChanges = false;
        this.currentGameId = null;
        this.bindEvents();
    }
    
    bindEvents() {
        // 瀏覽器離開頁面警告
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges && this.hasAnyData()) {
                e.preventDefault();
                e.returnValue = '您有未保存的比賽資料，確定要離開嗎？';
                return '您有未保存的比賽資料，確定要離開嗎？';
            }
        });
        
        // 頁面可見性變化警告（適用於移動端）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.hasUnsavedChanges && this.hasAnyData()) {
                console.log('頁面隱藏，有未保存的資料');
            }
        });
    }
    
    markAsChanged() {
        this.hasUnsavedChanges = true;
        this.updateVisualState();
    }
    
    markAsSaved() {
        this.hasUnsavedChanges = false;
        this.updateVisualState();
    }
    
    updateVisualState() {
        const container = document.querySelector('.container');
        if (!container) return;
        
        container.classList.remove('changed', 'saved');
        
        if (this.hasUnsavedChanges) {
            container.classList.add('changed');
        } else if (this.hasAnyData()) {
            container.classList.add('saved');
        }
    }
    
    hasAnyData() {
        // 檢查是否有任何已填寫的資料
        if (typeof selectedPlayers !== 'undefined' && Object.keys(selectedPlayers).length > 0) return true;
        if (typeof firstAttackData !== 'undefined' && Object.keys(firstAttackData).length > 0) return true;
        if (typeof winLoseData !== 'undefined' && Object.keys(winLoseData).length > 0) return true;
        if (typeof bonusTeam !== 'undefined' && bonusTeam) return true;
        return false;
    }
}

/**
 * 載入動畫管理器
 */
class LoadingManager {
    static show(element, message = '載入中...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.style.display = 'block';
            element.textContent = message;
            element.classList.add('loading');
        }
    }
    
    static hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.style.display = 'none';
            element.classList.remove('loading');
        }
    }
    
    static showButton(button, message = '處理中...') {
        if (typeof button === 'string') {
            button = document.getElementById(button);
        }
        
        if (button) {
            button.dataset.originalText = button.textContent;
            button.textContent = message;
            button.disabled = true;
        }
    }
    
    static hideButton(button) {
        if (typeof button === 'string') {
            button = document.getElementById(button);
        }
        
        if (button) {
            button.textContent = button.dataset.originalText || button.textContent;
            button.disabled = false;
            delete button.dataset.originalText;
        }
    }
}

/**
 * 模態框管理器
 */
class ModalManager {
    static show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            
            // 自動聚焦到第一個可聚焦元素
            setTimeout(() => {
                const focusable = modal.querySelector('button, input, select, textarea, [tabindex]');
                if (focusable) focusable.focus();
            }, 100);
        }
    }
    
    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    static bindCloseEvents(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // 點擊背景關閉
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide(modalId);
            }
        });
        
        // ESC 鍵關閉
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide(modalId);
            }
        });
        
        // 關閉按鈕
        const closeButtons = modal.querySelectorAll('[data-close]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.hide(modalId);
            });
        });
    }
}

/**
 * 表單驗證器
 */
class FormValidator {
    static validateGameCompletion(gameData) {
        const missingItems = [];
        const totalItems = 16 * 4; // 16個SET，每個SET 4個項目（主客選手、先攻、勝負）
        let completedItems = 0;
        
        // 檢查每個SET的完整性
        if (gameData && gameData.sets) {
            gameData.sets.forEach((set, index) => {
                const setNum = index + 1;
                const requiredPlayers = window.setPlayerCounts ? window.setPlayerCounts[setNum] : 1;
                
                // 檢查選手選擇
                if (set.awayPlayers && set.awayPlayers.length === requiredPlayers) {
                    completedItems++;
                } else {
                    missingItems.push(`SET${setNum} 客隊選手`);
                }
                
                if (set.homePlayers && set.homePlayers.length === requiredPlayers) {
                    completedItems++;
                } else {
                    missingItems.push(`SET${setNum} 主隊選手`);
                }
                
                // 檢查先攻選擇
                if (set.firstAttack) {
                    completedItems++;
                } else {
                    missingItems.push(`SET${setNum} 先攻未選擇`);
                }
                
                // 檢查勝負選擇
                if (set.winner) {
                    completedItems++;
                } else {
                    missingItems.push(`SET${setNum} 勝負未選擇`);
                }
            });
        }
        
        return {
            isValid: missingItems.length === 0,
            missingItems: missingItems,
            completedItems: completedItems,
            totalItems: totalItems,
            completionRate: Math.round((completedItems / totalItems) * 100)
        };
    }
}

/**
 * 動畫效果管理器
 */
class AnimationManager {
    static fadeIn(element, duration = 300) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            const startTime = performance.now();
            
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            }
            
            requestAnimationFrame(animate);
        }
    }
    
    static fadeOut(element, duration = 300) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            const startTime = performance.now();
            const startOpacity = parseFloat(window.getComputedStyle(element).opacity) || 1;
            
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = startOpacity * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                }
            }
            
            requestAnimationFrame(animate);
        }
    }
    
    static slideDown(element, duration = 300) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.style.height = '0';
            element.style.overflow = 'hidden';
            element.style.display = 'block';
            
            const targetHeight = element.scrollHeight;
            const startTime = performance.now();
            
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.height = (targetHeight * progress) + 'px';
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.height = '';
                    element.style.overflow = '';
                }
            }
            
            requestAnimationFrame(animate);
        }
    }
}

/**
 * 鍵盤快捷鍵管理器
 */
class KeyboardManager {
    constructor() {
        this.shortcuts = new Map();
        this.bindEvents();
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            const key = this.getKeyString(e);
            const handler = this.shortcuts.get(key);
            
            if (handler && !this.isInputFocused()) {
                e.preventDefault();
                handler(e);
            }
        });
    }
    
    addShortcut(keys, handler) {
        this.shortcuts.set(keys, handler);
    }
    
    removeShortcut(keys) {
        this.shortcuts.delete(keys);
    }
    
    getKeyString(e) {
        const parts = [];
        
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');
        
        parts.push(e.key);
        
        return parts.join('+');
    }
    
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable
        );
    }
}

// 初始化全域 UI 管理器
window.addEventListener('DOMContentLoaded', () => {
    // 初始化狀態管理器
    window.stateManager = new StateManager();
    
    // 初始化鍵盤管理器
    window.keyboardManager = new KeyboardManager();
    
    // 添加常用快捷鍵
    window.keyboardManager.addShortcut('Ctrl+s', (e) => {
        if (typeof saveGameData === 'function') {
            saveGameData();
        }
    });
    
    window.keyboardManager.addShortcut('Escape', (e) => {
        // 關閉所有打開的模態框
        const modals = document.querySelectorAll('.modal[style*="display: block"]');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    });
    
    // 初始化所有模態框的關閉事件
            const modalIds = ['playerModal', 'previewModal'];
    modalIds.forEach(id => {
        ModalManager.bindCloseEvents(id);
    });
});

// 匯出類別和函數供全域使用
window.CustomDialog = CustomDialog;
window.CompletionIndicator = CompletionIndicator;
window.StateManager = StateManager;
window.LoadingManager = LoadingManager;
window.ModalManager = ModalManager;
window.FormValidator = FormValidator;
window.AnimationManager = AnimationManager;
window.KeyboardManager = KeyboardManager;

// 為了向後相容，提供全域函數
window.showCustomAlert = CustomDialog.showAlert;
window.showCustomConfirm = CustomDialog.showConfirm;

// 重置「不再提醒」設定的工具函數
window.resetDontShowSettings = function() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('dontShow_'));
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`已重置 ${keys.length} 個「不再提醒」設定`);
}; 