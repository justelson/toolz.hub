document.addEventListener('visibilitychange', () => {
  chrome.runtime.sendMessage({
    type: 'PAGE_VISIBILITY',
    visible: document.visibilityState === 'visible'
  });
});
