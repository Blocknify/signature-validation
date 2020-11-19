const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', (event) => {
    const fileList = event.target.files;
});
const dropArea = document.getElementById('drop-area');

dropArea.addEventListener('dragover', (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.dataTransfer.dropEffect = 'copy';
});

// Listener that's triggered on click
fileSelector.addEventListener("change", event => {
    event.stopPropagation();
    event.preventDefault();

    const fileList = event.target.files;
    const progressElement = document.getElementById("pages");

    const reader = new FileReader();

    reader.addEventListener("load", event => {
        const file = event.target.result;

        hashPDFDocument(file, (hash) => {
            document.getElementById("message").style = "margin-top:100px"
            document.getElementById("message").innerHTML = `Your document fingerprint is: <br><p class="hash">${hash}</p>`
        }, ({ hashed_pages, total_pages }) => {
            console.log("Updating number of hashed pages");
            return progressElement.innerText = "Hashed " + hashed_pages + " out of " + total_pages + " pages."

        });
    })

    if (fileList.length > 0 && fileList.length < 2) {
        reader.readAsDataURL(fileList[0])
    }

})

// Listener that's triggered on drop-in
dropArea.addEventListener('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    const fileList = event.dataTransfer.files;
    const progressElement = document.getElementById("pages");
    // we can access the file here
    const reader = new FileReader();
    reader.addEventListener("load", event => {
        const file = event.target.result;

        hashPDFDocument(file, (hash) => {
            console.log("This is the hash", hash);
            document.getElementById("message").style = "margin-top:100px"
            document.getElementById("message").innerHTML = `Your document fingerprint is: <br><p class="hash">${hash}</p>`
        }, ({ hashed_pages, total_pages}) => {
            console.log("Updating number of hashed pages");
            return progressElement.innerText = "Hashed " + hashed_pages + " out of " + total_pages + " pages."
        });
    })

    if (fileList.length > 0 && fileList.length < 2) {
        reader.readAsDataURL(fileList[0])
    }
});