(() => {
    const logVisit = () => {
        const url = window.location.href;
        let searchQuery = "N/A";

        // Extract all query parameters dynamically
        const params = new URLSearchParams(window.location.search);

        // Find the most relevant search query dynamically
        for (const [key, value] of params.entries()) {
            if (/(search|query|q|keyword|term|k|p)/i.test(key)) { // 'k' (Amazon), 'p' (Yahoo), etc.
                searchQuery = decodeURIComponent(value.replace(/\+/g, " ")); // Ensure proper formatting
                break;
            }
        }

        // Ensure it captures search query from path (for certain sites like DuckDuckGo)
        if (searchQuery === "N/A") {
            const pathSegments = url.split("/").filter(Boolean);
            pathSegments.forEach((segment) => {
                if (/search|query|results|find/i.test(segment)) {
                    searchQuery = decodeURIComponent(segment.replace(/\+/g, " "));
                }
            });
        }

        console.log("🔍 Logging visit:", { url, searchQuery });

        // Send visit log to background script
        chrome.runtime.sendMessage({
            action: "logVisit",
            url,
            searchQuery,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            browser: navigator.userAgent.match(/(firefox|msie|chrome|safari|edge)/i)?.[0] || "Unknown",
            osInfo: navigator.platform,
            deviceType: /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop"
        });
    };

    // Initial log
    logVisit();

    // Detect URL changes dynamically (for SPAs like YouTube, Amazon, etc.)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            logVisit();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Function to format file size in KB, MB, or GB
    const formatFileSize = (sizeInBytes) => {
        if (sizeInBytes < 1024) return sizeInBytes + " B";
        if (sizeInBytes < 1024 * 1024) return (sizeInBytes / 1024).toFixed(2) + " KB";
        if (sizeInBytes < 1024 * 1024 * 1024) return (sizeInBytes / (1024 * 1024)).toFixed(2) + " MB";
        return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    };

    // Function to handle file uploads
    const handleFileUpload = (event) => {
        const input = event.target;
        if (input.files.length > 0) {
            Array.from(input.files).forEach(file => { // Handle multiple files
                const fileType = file.type || "Unknown";
                const fileName = file.name || "Unknown";

                const fileDetails = {
                    action: "logFileUpload",
                    url: window.location.href,
                    fileName: fileName,
                    fileType: fileType,
                    fileSize: formatFileSize(file.size),
                    userFilePath: `Uploaded from this device`
                };

                console.log("📂 File upload detected:", fileDetails);

                // Send file details to background script
                chrome.runtime.sendMessage(fileDetails);
            });
        }
    };

    // Attach event listener to all file input elements on the page
    document.addEventListener("change", (event) => {
        if (event.target && event.target.type === "file") {
            handleFileUpload(event);
        }
    });

})();


//working