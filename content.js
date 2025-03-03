(() => {
    const url = window.location.href;
    let searchQuery = "N/A";

    // Extract search query for Google searches
    if (url.includes("google.com/search")) {
        const params = new URLSearchParams(window.location.search);
        searchQuery = params.get("q") || "N/A";
    }

    console.log("Logging visit:", url, searchQuery); // Debugging log

    chrome.runtime.sendMessage({ action: "logVisit", url, searchQuery });

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
                const fileType = file.type || "Unknown"; // Ensure all files get detected
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