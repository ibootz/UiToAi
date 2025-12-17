// ============================================================
// UiToAi - 通知系统
// ============================================================

// 创建成功导出通知
export async function showExportSuccess(result) {
  const { folder, filesCount, downloadPath, duration } = result;

  try {
    // 尝试获取图标，如果不存在则不使用图标
    let iconUrl;
    try {
      iconUrl = chrome.runtime.getURL('icons/icon48.png');
    } catch (iconErr) {
      // 图标不存在，不使用图标
      console.warn('[UiToAi] 图标文件不存在，通知将不显示图标');
    }

    const notificationOptions = {
      type: 'basic',
      title: 'UiToAi 导出完成',
      message: `已成功导出 ${filesCount} 个文件到 ${folder}`,
      contextMessage: `保存位置: ${downloadPath}`,
      priority: 1,
      isClickable: true
    };

    // 只有在图标存在时才添加 iconUrl
    if (iconUrl) {
      notificationOptions.iconUrl = iconUrl;
    }

    // 显示桌面通知
    await chrome.notifications.create(notificationOptions);

    console.log(`[UiToAi] 导出成功通知已发送: ${folder}`);
  } catch (err) {
    console.warn('[UiToAi] 无法显示桌面通知:', err);

    // 如果桌面通知失败，尝试发送消息到 popup 显示
    try {
      chrome.runtime.sendMessage({
        type: 'EXPORT_SUCCESS',
        data: {
          folder,
          filesCount,
          downloadPath,
          duration: `${duration}ms`
        }
      }).catch(() => {
        console.warn('[UiToAi] 无法发送成功消息到 popup');
      });
    } catch (msgErr) {
      console.warn('[UiToAi] 消息发送也失败:', msgErr);
    }
  }
}

// 创建导出失败通知
export async function showExportError(result) {
  const { error, folder, failed } = result;
  const failedCount = failed?.length || 0;

  try {
    // 尝试获取图标，如果不存在则不使用图标
    let iconUrl;
    try {
      iconUrl = chrome.runtime.getURL('icons/icon48.png');
    } catch (iconErr) {
      // 图标不存在，不使用图标
      console.warn('[UiToAi] 图标文件不存在，通知将不显示图标');
    }

    const notificationOptions = {
      type: 'basic',
      title: 'UiToAi 导出失败',
      message: `导出 ${failedCount} 个文件时发生错误`,
      contextMessage: `错误: ${error}`,
      priority: 2
    };

    // 只有在图标存在时才添加 iconUrl
    if (iconUrl) {
      notificationOptions.iconUrl = iconUrl;
    }

    await chrome.notifications.create(notificationOptions);

    console.error(`[UiToAi] 导出失败通知: ${error}`);
  } catch (err) {
    console.warn('[UiToAi] 无法显示错误通知:', err);

    // 发送错误消息到 popup
    try {
      chrome.runtime.sendMessage({
        type: 'EXPORT_ERROR',
        data: {
          error,
          failedCount
        }
      }).catch(() => {
        console.warn('[UiToAi] 无法发送错误消息到 popup');
      });
    } catch (msgErr) {
      console.warn('[UiToAi] 错误消息发送也失败:', msgErr);
    }
  }
}

// 创建简单的提示通知
export async function showNotification(title, message, type = 'basic') {
  try {
    // 尝试获取图标，如果不存在则不使用图标
    let iconUrl;
    try {
      iconUrl = chrome.runtime.getURL('icons/icon48.png');
    } catch (iconErr) {
      // 图标不存在，不使用图标
      console.warn('[UiToAi] 图标文件不存在，通知将不显示图标');
    }

    const notificationOptions = {
      type,
      title,
      message,
      priority: 0
    };

    // 只有在图标存在时才添加 iconUrl
    if (iconUrl) {
      notificationOptions.iconUrl = iconUrl;
    }

    await chrome.notifications.create(notificationOptions);
  } catch (err) {
    console.warn('[UiToAi] 通知显示失败:', err);
  }
}

// 处理通知点击事件
export function setupNotificationHandlers() {
  chrome.notifications.onClicked.addListener((notificationId) => {
    // 当用户点击通知时，打开下载目录
    chrome.downloads.showDefaultFolder();
    console.log('[UiToAi] 用户点击通知，打开下载目录');
  });

  chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    if (byUser) {
      console.log(`[UiToAi] 用户关闭通知: ${notificationId}`);
    }
  });
}