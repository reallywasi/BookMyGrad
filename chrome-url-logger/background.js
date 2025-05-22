chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const log = {
      url: changeInfo.url,
      timestamp: new Date().toISOString()
    };

    console.log("SIEM Log:", log);

    // Optional: Send log to local server
    /*
    fetch("http://localhost:5000/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(log)
    }).catch((err) => console.error("Failed to send log", err));
    */
  }
});
