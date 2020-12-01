var sha256 = document.createElement("script");
sha256.src = "dist/sha256.min.js";
document.head.appendChild(sha256);

let OPT_DEPENDENCY = 1;

function sortOnKeys(dict) {
    var sorted = [];
    for (var key in dict) {
        sorted[sorted.length] = key;
    }
    sorted.sort();
    var tempDict = {};
    for (var i = 0; i < sorted.length; i++) {
        tempDict[sorted[i]] = dict[sorted[i]];
    }
    return tempDict;
}

function loadDependencies(commonObjs, objs, operatorList) {
    let dependencies = [];
    var fnArray = operatorList.fnArray;
    var fnArrayLen = fnArray.length;
    var argsArray = operatorList.argsArray;

    for (var i = 0; i < fnArrayLen; i++) {
        if (OPT_DEPENDENCY === fnArray[i]) {
            var deps = argsArray[i];
            for (var n = 0, nn = deps.length; n < nn; n++) {
                var obj = deps[n];
                var common = obj.substring(0, 2) === "g_";
                var promise;
                if (common) {
                    promise = new Promise(function (resolve) {
                        commonObjs.get(obj, resolve);
                    });
                } else {
                    promise = new Promise(function (resolve) {
                        objs.get(obj, resolve);
                    });
                }
                dependencies.push(promise);
            }
        }
    }

    return Promise.all(dependencies);
}

function loadBlobs(unloadedBlobs) {
    let blobs = [];
    var unloadedBlobsLen = unloadedBlobs.length;
    for (var i = 0; i < unloadedBlobsLen; i++) {
        blobs.push(
            new Promise(function (resolve) {
                fetch(unloadedBlobs[i].currentSrc)
                    .then(function (res) {
                        return res.arrayBuffer();
                    })
                    .then(resolve);
            })
        );
    }
    return Promise.all(blobs);
}

function getPageContent(commonObjs, objs, operatorList, annotationsData) {
    return new Promise(function (resolve) {
        var g = 0;
        var resources = {};
        var unloadedBlobs = [];
        var unloadedBlobsKeys = [];
        var resourcesRename = {};

        loadDependencies(commonObjs, objs, operatorList).then(function (values) {
            var fnArray = operatorList.fnArray;
            var fnArrayLen = fnArray.length;
            var argsArray = operatorList.argsArray;

            for (var i = 0; i < fnArrayLen; i++) {
                if (OPT_DEPENDENCY === fnArray[i]) {
                    var deps = argsArray[i];
                    for (var n = 0, nn = deps.length; n < nn; n++) {
                        var obj = deps[n];

                        var common = obj.substring(0, 2) === "g_";
                        var promise;
                        var value;

                        if (!resourcesRename[obj]) {
                            // rename commonObjs resources
                            var resourceName = obj;

                            if (common) {
                                resourceName = "resource-" + g++;
                                operatorList.argsArray[i][n] = resourceName;
                                value = commonObjs.get(obj);
                            } else {
                                value = objs.get(obj);
                            }

                            // add only objs that have data or src
                            if (value.data) {
                                resources[resourceName] = value.data;
                            } else if (value.currentSrc) {
                                unloadedBlobs.push(value);
                                unloadedBlobsKeys.push(resourceName);
                            }

                            resourcesRename[obj] = resourceName;
                        } else {
                            operatorList.argsArray[i][n] = resourcesRename[obj];
                        }
                    }
                } else if (Array.isArray(argsArray[i])) {
                    // rename resources when used
                    var deps = argsArray[i];
                    for (var n = 0, nn = deps.length; n < nn; n++) {
                        if (resourcesRename[operatorList.argsArray[i][n]]) {
                            operatorList.argsArray[i][n] =
                                resourcesRename[operatorList.argsArray[i][n]];
                        }
                    }
                }
            }

            loadBlobs(unloadedBlobs).then(function (values) {
                for (var i in unloadedBlobsKeys) {
                    resources[unloadedBlobsKeys[i]] = values[i];
                }
                resolve({ resources, operatorList, annotationsData });
            });
        });
    });
}

function hasBlocknifyQRCode(pageContent) {
    var found = false;

    //check if it is a part of QR code (hash of blocknify logo)
    for (var i in pageContent.resources)
        if (
            pageContent.resources[i] ==
            "8b8cd8274c8f89d0ebf7a67ebbd657dedf0687f3db08d65de6cd0b9314b09001"
        )
            found = true;

    if (!found) {
        console.log("No blocknify logo found");
        return -1;
    }

    for (
        var last_index = pageContent.operatorList.fnArray.length - 1;
        last_index >= 24;
        last_index--
    ) {
        if (pageContent.operatorList.fnArray[last_index] != 11) continue;

        var found = (function (last_index) {
            if (last_index - 24 < 0) return -1;

            // Blocknify QR code contents
            var fnArrayQR = [
                10,
                12,
                74,
                10,
                12,
                74,
                10,
                12,
                1,
                85,
                11,
                75,
                11,
                10,
                12,
                74,
                10,
                12,
                1,
                85,
                11,
                75,
                11,
                75,
                11,
            ];
            var argsArrayQR = [
                null,
                [1, 0, 0, 1, 0, 0],
                [null, [0, 0, 612, 792]],
                null,
                [0.05, 0, 0, 0.05, 22, 22],
                [null, [0, 0, 500, 600]],
                null,
                [500, 0, 0, 600, 0, 0],
                ["img_p0_13"],
                ["img_p0_13", 500, 600],
                null,
                [],
                null,
                null,
                [0.02875, 0, 0, 0.02875, 23.25, 28.25],
                [null, [0, 0, 800, 800]],
                null,
                [800, 0, 0, 800, 0, 0],
                ["img_p0_14"],
                ["img_p0_14", 800, 800],
                null,
                [],
                null,
                [],
                null,
            ];

            for (var i = 0, j = last_index - 24; i < 24; i++, j++) {
                if (pageContent.operatorList.fnArray[j] != fnArrayQR[i]) {
                    return -1;
                }

                if (i == 8) {
                    if (
                        "8b8cd8274c8f89d0ebf7a67ebbd657dedf0687f3db08d65de6cd0b9314b09001" !=
                        pageContent.resources[pageContent.operatorList.argsArray[j][0]]
                    )
                        return -1;
                }
            }

            for (var i = 0, j = last_index - 24; i < 24; i++, j++) {
                if (i != 2 && i != 8 && i != 9 && i != 18 && i != 19) {
                    if (
                        JSON.stringify(pageContent.operatorList.argsArray[j]) !=
                        JSON.stringify(argsArrayQR[i])
                    ) {
                        return -1;
                    }
                }
            }

            console.log("Blocknify QR Code Found", last_index);

            return last_index;
        })(last_index);

        if (found != -1) return found;
    }

    return -1;
}

function removeBlocknifyQRCode(pageContent, last_index) {
    if (last_index - 24 < 0) return pageContent;

    delete pageContent.resources[
        pageContent.operatorList.argsArray[last_index - 24 + 8][0]
    ];
    delete pageContent.resources[
        pageContent.operatorList.argsArray[last_index - 24 + 18][0]
    ];

    pageContent.operatorList.argsArray.splice(last_index - 24, 25);
    pageContent.operatorList.fnArray.splice(last_index - 24, 25);

    return pageContent;
}

// Started using it and it does work but it will also present an error as it original call is not waiting
function checkAgainstBlockchain(signer, toml) {
    return new Promise((resolve, reject) => {

        axios.get(signer.stellarTx)
            .then((response) => {

                let sourceAccount = response.data.source_account;
                signer.tomlVerified = toml.indexOf(sourceAccount) >= 0;

                //Signature information from Stellar
                signer.postedBaseHash = base64ToBase16(response.data.memo);
                signer.base64SigHash = response.data.memo
                signer.stellarPostingDate = response.data.created_at

                //Verification against the raw information from the PDF
                signer.generatedMatchesPosted = signer.postedBaseHash === signer.signedTxHash;
                signer.verified = signer.generatedMatchesPosted && signer.signedTxContainsHash

                resolve(signer);
            })
            .catch((error) => {
                let message = "We experienced an error with retrieving transaction data from Stellar.";

                let exceptionObject = {
                    message: message,
                    receivedError: error,
                };

                console.error(exceptionObject);
                reject(message);
            });
    })
}

function base64ToBase16(base64) {
    return window
        .atob(base64)
        .split("")
        .map(function (char) {
            return ("0" + char.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("");
}

function getSignerData(item, i, annotation, contentHash) {
    //get dataurl
    var data = item.unsafeUrl;
    // seperate out the first part
    var dataUrl = data.substring(0, 23);

    // the same signature gets added more than once, this is here to isolate one of them and get the stellarLink
    let stellarExpertLink = annotation[i + 1].url;

    if (dataUrl === "data:text/plain;base64," && stellarExpertLink) {
        let base64Data = data.substring(23);
        let rawData = window.atob(base64Data);

        // Break up the parts and then remove what is used to isolate it
        let pattern = /: .*/g;
        let remove = /: /g;

        let inputs = rawData.match(pattern);

        var signer = {};

        signer.identity = inputs[0].replace(remove, "").trim();
        signer.identityObj = JSON.parse(signer.identity);
        signer.timestamp = inputs[2].replace(remove, "");
        signer.signers = inputs[3].replace(remove, "");

        signer.signedTx = inputs[7].replace(remove, "");
        signer.publicKey = inputs[6].replace(remove, "").trim();

        signer.identityHash = sha256(signer.identity);

        // turn expert links to stellar API (horizon) links and handle testnet
        let horizonLink;
        let expertLink;
        if (stellarExpertLink.indexOf("public") >= 0) {
            expertLink = "https://stellar.expert/explorer/public/tx/";
            horizonLink = "https://horizon.stellar.org/transactions/";
        } else if (stellarExpertLink.indexOf("testnet") >= 0) {
            expertLink = "https://stellar.expert/explorer/testnet/tx/";
            horizonLink = "https://horizon-testnet.stellar.org/transactions/";
        } else {
            throw new Error("Something is wrong with the Stellar link.")
        }

        console.log("stellarExpertLink", stellarExpertLink);


        signer.stellarTx = stellarExpertLink.replace(expertLink, horizonLink).trim();

        // determine if this is the poster of the document or not, if so add added signers list
        signer.signatureInfoHash = signer.identityHash + contentHash + signer.timestamp
        if (signer.signers !== "null") {
            signer.signatureInfoHash += signer.signers;
        }

        signer.signatureInfoHash = sha256(signer.signatureInfoHash);

        // check if the hashed signing info string is in the signed tx
        let signatureInfoHashMatch = signer.signedTx.match(signer.signatureInfoHash);

        if (signatureInfoHashMatch.length === 1) {
            signer.signedTxContainsHash = true;
        } else {
            console.error("The signer " + signer.identityObj.name + " doesn't have a matching hash.")
            signer.signedTxContainsHash = false;
        }

        //  create final signature hash to compare against Stellar
        signer.signedTxHash = sha256(signer.signedTx.substring(2));

        return signer;
    } else {
        return;
    }
}

function generatePageHash(page) {
    return new Promise(function (resolve) {
        page
            .getAnnotations()
            .then(function (annotationsData) {
                page
                    .getOperatorList()
                    .then(function (opList) {
                        getPageContent(page.commonObjs, page.objs, opList, annotationsData)
                            .then(({ resources, operatorList, annotationsData }) => {
                                for (var i in resources) {
                                    resources[i] = sha256(resources[i]);
                                }

                                if (
                                    Object.keys(resources)[0] &&
                                    resources[Object.keys(resources)[0]] ==
                                    "cf90d646f3de5715fb93d5025fca26a37e7f81d7165bf9ee34157c1586e595f4"
                                ) {
                                    // beter detection
                                    return resolve(null);
                                }

                                var pageContent = {
                                    resources: sortOnKeys(resources),
                                    operatorList: opList,
                                    annotationsData: annotationsData,
                                };

                                var lastIndex = hasBlocknifyQRCode(pageContent);
                                if (lastIndex != -1)
                                    pageContent = removeBlocknifyQRCode(pageContent, lastIndex);

                                var hash = sha256(JSON.stringify(sortOnKeys(pageContent)));

                                resolve(hash);
                            })
                            .catch((error) => {
                                console.error("Error getting page content", error);
                            });
                    })
                    .catch((error) => {
                        console.error("Error fetching op list", error);
                    });
            })
            .catch((error) => {
                console.error("Error fetching annotations data", error);
            });
    });
}

function getAllSignatures(annotationsData, contentHash) {

    // Clear existing signatureData if re-ran
    let signatureData = [];
    console.log("This is the annotations data", annotationsData);

    // Index 0 and Index 1 are the unsafe dataURLs that have our signature data in them ( they are dupulcates ).
    // At index 2, the Stellar link is there.
    // Such a pattern continues for each signature

    for (var i = 0; i < annotationsData.length; i++) {

        // To get rid of the issue with dupulcate dataURLs, we need to make sure that the current annotations
        // data is an unsafeUrl (dataURL) and that the next one after it is a normal URL ( Stellar link )
        if (
            annotationsData[i].unsafeUrl &&
            annotationsData[i + 1] !== undefined &&
            annotationsData[i + 1].url !== undefined
        ) {
            // create the final object with all the signature info
            let signer = getSignerData(annotationsData[i], i, annotationsData, contentHash);

            if (signer) {
                signatureData.push(signer);
            } else {
                signatureData.push(null);
            }
        }
    }
    return signatureData;
}

function hashPDFDocument(data, callback, progress) {
    const getNumberOfPages = (filteredPNGImagesArray, originalNumberOfPages) => {
        if (!filteredPNGImagesArray.length || originalNumberOfPages === 1) {
            return originalNumberOfPages;
        }

        const findBlocknifyImage = sha256(filteredPNGImagesArray[1]);

        if (
            findBlocknifyImage ===
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        ) {
            return originalNumberOfPages - 1;
        }

        return originalNumberOfPages;
    };
    pdfjsLib
        .getDocument(data)
        .promise.then(async function (pdf) {
            var unhashedPages = [];
            var hashed_pages = 0;
            const lastPage = await pdf.getPage(pdf.numPages);
            const lastPageOperatorList = await lastPage.getOperatorList();
            let images = [];
            for (let i = 0; i < lastPageOperatorList.fnArray.length; i++) {
                if (lastPageOperatorList.fnArray[i] == pdfjsLib.OPS.paintImageXObject) {
                    images.push(lastPageOperatorList.argsArray[i][0]);
                }
            }
            const filteredPNGImagesData = images.map((image) =>
                lastPage.objs.get(image)
            );
            const numberOfPages = getNumberOfPages(
                filteredPNGImagesData,
                pdf.numPages
            );

            //   get audit page annotations if we have detected an audit page within getNumberOfPages
            var auditPageAnnotations;
            if (numberOfPages !== pdf.numPages) {
                auditPageAnnotations = await lastPage.getAnnotations();
            }

            for (var i = 1; i <= numberOfPages; i++) {
                unhashedPages.push(
                    new Promise(function (resolve) {
                        pdf.getPage(i).then(function (page) {
                            generatePageHash(page).then(function (hash) {
                                if (progress)
                                    progress({
                                        total_pages: unhashedPages.length,
                                        hashed_pages: ++hashed_pages,
                                    });
                                resolve(hash);
                            });
                        });
                    })
                );
            }

            let pageHashes = await Promise.all(unhashedPages);

            return ({ pageHashes, auditPageAnnotations });
        })
        .then(async function ({ pageHashes, auditPageAnnotations }) {

            pageHashes = pageHashes.filter((item) => {
                return item != null;
            });
            let contentHash = sha256(JSON.stringify(pageHashes));

            //   get all signatures and verify them
            if (auditPageAnnotations) {
                let signatures = getAllSignatures(auditPageAnnotations, contentHash);

                if (navigator.onLine) {
                    verifySignatures(signatures);
                    callback(contentHash);
                } else {
                    //add listener to trigger function when online
                    window.addEventListener('online', async () => {
                        verifySignatures(signatures);
                        callback(contentHash);
                    });
                }

            } else {
                callback(contentHash);
            }

        });
}

// Check transations against the toml file
async function fetchToml() {

    let tomlLocation = "https://blocknify.com/.well-known/stellar.toml";

    //let toml = await axios.get(tomlLocation).data;
    let response = await axios.get(tomlLocation);
    let toml = response.data;

    return toml;
}

async function verifySignatures(signatures) {

    let toml = await fetchToml();

    let checkedSignatures = await Promise.all(signatures.map(signature => {
        return checkAgainstBlockchain(signature, toml);
    }));

    // We will build html signatures only for those signatures which are verified
    let verifiedSignatures = checkedSignatures.filter((signature) => {
        return signature.verified === true && signature.tomlVerified === true;
    });

    let unverifiedSignatures = checkedSignatures.filter((signature) => {
        return signature.verified === false || signature.tomlVerified === false;
    });

    console.log("These are the verified signatures", verifiedSignatures);
    console.log("These are the unverified signatures", unverifiedSignatures);

    // You can use the verified and unverified signatures and add a setting to the function
    // to decide what you want to add into the HTML

    // To see if the transaction's source account of the signature was verified against our toml you can use the
    // "signature.tomlVerified" key.
    if (checkedSignatures.length > 0) {
        buildSignatureHtml(checkedSignatures);
    };

    // For now, let's just return 0
    return 0;

}

function formatDate(date) {

    const options = { year: "numeric", month: "long", day: "numeric" }
    return new Date(date).toLocaleDateString(undefined, options)

}

function formatTime(date) {

    const options = {timeStyle: 'short'}
    return new Date(date).toLocaleTimeString([], options)

}

function buildSignatureHtml(signatures) {

    html = '<div class="doc-history" id="doc-history"> <h2  style="margin-top: 25px 0">Signature and document verification</h2> <h6 class="doc-title">All this data has been retrieved directly from your PDF audit trail. We require all signers to verify their email, verify their phone number with an SMS challenge, create a unique signing PIN, and ask them to input their legal name.<br><br>At the time of signature, we locally create a PDF fingerprint, then add the signer\'\s identity information, added signers (if signers were added), and sign this data with their private key. We then SHA256 hash this information to generate a signature hash and post this signature hash on the Stellar Blockchain. <br><br>To verify signatures, we do the following steps: <ol><li>Regenerate the document\'\s fingerprint with the given PDF and match it with the signed document fingerprinted. Ensuring this PDF\'\s visual content is the exact same as the PDF when the signer signed the document.</li><li>We take the identity information, signature, and stellar transaction from the attached audit trail and use it to validate against signature hash cryptographically.</li><li>We then match the verified signature hash with the posted Stellar transaction. Ensuring this information authentic and has not been tampered with.</li><li>We verify that the account that submitted the signature hash is a verified Blocknify account.</li></ol>You can view the verification source code on our <a href="https://github.com/Blocknify/signature-validation">GitHub</a>.<br><br>Please be sure to review the identity information matches what you expect from your signer (e.g., email matches their known email, and phone number matches their known number).</h4> <h2 style="margin-bottom:20px">Attached signatures</h2>'

    for (var i = 0; i < signatures.length; i++) {
        let currentSigner = signatures[i]

        let signingDate = formatDate(currentSigner.timestamp * 1000)
        let signingTime = formatTime(currentSigner.timestamp * 1000)
        let postingDate = formatDate(currentSigner.stellarPostingDate)
        let postingTime = formatTime(currentSigner.stellarPostingDate)

        let addedSigners = currentSigner.signers
            .replace('[', "")
            .replace(']', "")
            .replace('"', "")
            .replace('"', "")

        let verificationText = currentSigner.verified=== true ? 'Signature verified' : 'Signature unverified'
        

        html += ' <table class=\"table-doc\" >\r\n                              <tr style=\"margin-top: 25px\">\r\n                                 <td valign=\"top\" style=\"padding-top: 5px; padding-right: 15px;\" >'
        if (currentSigner.verified === true && currentSigner.tomlVerified === true) {
            html += '<img style=\"height: 37px;\" src=\"data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAAdVBMVEUAAAAQz3AI1nMIz3ALz3AL1HUM03QN0nMN1nML1HML0nIL1HIL1HUL1nUL1HIL1HQM1XQM03QM1HQM03MM1HUL1HML1XUL0nML1HQM03MM03UM1XUM1HQM1HQM1HQM1HUM1XUL1HML1XUN1XUM1HMM1HQM1HRKVN0hAAAAJnRSTlMAEB8gMDBAUFBfYGBgb3Bwf4CPkJCfn6Cgr6+vsL\/Pz8\/f39\/v7+Jy5fkAAAl\/SURBVHja7V2Jcps6G5UqW7Q1jYyJuji\/zI8u6P0f8SYk0OTciYboCHBmfGZtk2AffYu+TUjccMMNN9xwwzVC6rKy9lQVe\/GJoY9NmNC7g\/qkNFxAWPVZaXx+KqfwgoutTFnV53aiosUEWRhrH6y9WhNSTRjgSilG7Ew7WcvJlGVprA9\/4a2+Qh7+mQZ+tUMbYvAHcV340YdHtEBjUyqElTv5zo9\/veZyqU1ZlKZ2XXjGSV6JUh0vYcC9eB+7orKPqI2WrwmGAV6JrbAvh+9VnazrwzM6k7IIvzZkIrXt820WatC6Xq1P4ziwADzo9AfWhEw47wTonOGstRocxbp27cYvf67LR1SmLJQYQDM5ivWg+2cWtRZ5MazPN7EWvj3TqGR+w3uy+H6\/Kg+nFpF1eIIRa2AXnlCJZXDH7PEJQeF3sRSqtQIvu5DsQSbBGyWWxGEhvYI9fkBjD8vZ\/ZNitWJhVGGCP6nlBKKWN8RfdPQ2Y8eyYgWogwsTjsu4ebVadG1cWChR8WtHdfIlP+4LkRPH8Agt1sVAJW8EVgTGQohEJTOTXf\/kepVYH3chZyz5bYjdC7EFvg8WL7PI98THiqxMKsFDe4oHjzqH45ejPzdiM8iWdzRjuaTdCQ68y5SkUg24l2JTOE61j2PBSomNYZioQv7EOsN2kIRuyWZzpQLdOogknKHXwYL3wPfp9pEQkzTuVBV6H\/lDpXRpTrb5v\/gAyhDC\/5IdXkpsFSZ437hH2Gc8OOca732Y0H+0DtWnGIhPjRHDfIiPoAsh6ETF2ontiZA7ieqHP0v0k\/3ZXXyk8end2SKRWUbSy5R4s5UiASqE8M9o1Dv9iPIZhX6EUupV3vzlQyvUpaytT\/baOoRwEXEkERFVgkiIeomeGUs4tN15InkQHyZvBSCvv\/8DMp+bX5m14gEzcwf+BR+Rr6WFPnufHkpUc4SeYLqq+yATOXcXJVSmTNFe\/cEa6i7ieRgjxhDIJbZPrOQ9zyyt\/DJ\/v0lj4tVCRCAB+k852tqqwFVMzJSKFqpc+YngfojDHlbhjhj2yS0ttzQRA9uI9uEvjtRGMkJehtYvQSTB+34Lb3AiUj5komcuq013Wl+hK9\/VxtQtMikJQ3x6mOc3tRjeBGnKv6peHNq3ZXBFbFZ6ZrByGSSX+gktduVfW2kv6fBhXGo\/y8UHydu6gsq3eptR\/CHqyXJW4ntA7U2MNqtBPJhRAGlCJHaprArV5QLPgXXcDbQIK+nlMmMBaCLq+TkYuxveSOYVVQZXY4ntEHcj9OuskcCaxAeAFG8iuBsht3iFnd\/rjqOroXcRTJ2QCLWTiGIUfrRSKgRlInEiUT2nciYszHWKGFCy84jE9ZzPZ\/wYRvAmEieCRsJLhDcQNJG5RPhwy0UVy1ITqK2YQQTy4vzGbqGVQOwiUSJ8chWP0GUHzyWeDURgGdnkChMfwAE8L1EJAiJQzAJiyUUOlb8pj7FTlAj40GQTucwgSVeCIkTomtD48Pu5lRzSs8eJpHRJwE18zV9yQJcUJ4JJde7KbI0BA9kZiROJLyzV8BocGknEziQCXZL8RPTKRG5E0Lh4fWWIEIuHK8CvDrpv3muxrUrYY4hUJ0IEQ5IudUPUkZiAqCrjt5oR\/WJpiy818tN2qCfziRRcTfM+4tKMyB7Go\/ZhGJ+\/1FhxuoW6OdTf4kK\/EI6yxXWCj9HZJkF9wKfh\/ylGmQ8RkThGJFj93o3fEl38PZb984tEMyJB3bSTq0XNVq8XznCflv9YGxrgj4D6Py1jI6FcT2jyl9g34XTL\/G3nNu+UZBuF9bnsM81dHt2Sp\/Be6fV3eER\/VGhSedJdcOyctL8Wpz7gIWtokofwcDiCZmWt0ZW8tEd0r3goLf8yeXOAVfDBXfxnTAMcD87oy\/ROAnyNkMpKBOszghdJV0FlfDiAB1QI4Ue+LBVXQyfVauzaBxxN0mfcs3iJkEQALU7u2DDC4H+3AsAV0njVija3uzACi6WU78UkgB\/LROBJuzDBEQIhyqaUSDRKJLz1+ZoQSKwQB70aDg7TkhGHXEfjMVTjR7DjMTRsLa1CQ+JFf5nRzuRE4t+qMjSLiSkRzH54E5k\/31YjDzrKGvOEXuU3EQw9e\/k6gMMMl2qNQQean7yPF51OSIRsHgMcPCRn1RTMQr9DpMjheo\/wkKxEYFd0SATf28PycGJhIrDhAZEclr4Dd74cEeFGe0ciKoPrlR4S6ewFeRyNBSJg6ZxiFfP7mby9KyBCRb2z3DeW+XnIZ3tHIhfW0kehEkOoKcevNRDB0DgKZvbnDwiNjoKBCG\/pM2d\/Ciw18lHwRCQh6k1fbNnlF8lIBATCDSElnuwlti09EQGB8AOHxMnehGa4m4gwAkkYVrvDU12sw9cjEUYgGKETJ3sJKxmJJAiEGWJSHS0TcFwvRHSCQKh4UMP5NFYk9y9EbIJAuMD2O56HJZtxJjwhYVOnI\/Si45iA028HIo4tbCQQEarNxaQKI4iwl5jGkuexmUlChglEnZ+ZjPqdyeId2WjjR39cHuMswwjQCHK8jTjZy+uWyIAEJw6lf163XK5agCZO9lIhxQCMkIisihi3I1DldL4qbTiuzqEPhidCnjniZ2zAbX3d7nXvOXRrx445QCuhJU720uHWgDaLgQRFnOzlcMeZCNx7YohtlEXV4XVKxLuTqcCGhtY7ue27kx0IcxtIcwkD2EnOrYDvTtZ8jY3H1u9OdluL5Ad56wU0\/zfDKdu7kx1xBxuPn4RSAVTHlyG4ZmGnc71GfzMmP6ALTaLeionqkQdvJptYvIVuOg155q\/J2thhQt7tzV6sB8eXCCOXyfoHngw\/spjpbil\/VCtZiNv8miweONWV+Zqsbq2bidXSt7HtDudRKFIsiOFT1DrXZPF7JPuWLx533bJMTnTV5YMtLbmMyB0dY320EeQW8Vc9yyOBiVnmbnSeB9PS4iH1qQ\/EdbdEysUnj7I4WTfcVNL4QNyNToenfk9e9gUgxMH2cEyuu9GJK61ZVEzgVfiA8HUhBQGGyTtUlJxRlB5wqUs93FSyU2JDHLowwB32IwVjm0Flend6\/9p21bwUrJS4EqhLGNE45xpQe3eIFtel4JE\/e0RgwI9q1e7EleHgAsJ3AamgszpLcX1QZsq5OldpOfyfri8jFVvsp1\/sw4B7ca2QOw2uB1L9xvswotXi+oFUEHx1fSsq4A0agsbG0PVoQv5stPjckGqn1JWK4oYbbrjhhhv+Bb48Q0w0XMBkAAAAAElFTkSuQmCC"alt=\"\">'

        }else {
            html += '<img style=\"height: 37px;\" src=\"data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAA2CAMAAAC7m5rvAAAARVBMVEUAAAD\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QED\/QEBg67QdAAAAFnRSTlMAECAwQFBfYG9wf4CPkJ+gr7C\/z9\/vjWluHAAAAa5JREFUeNqlllG22yAMRCGQEiUtcYVg\/0ttkTjF9dOxxct82R9XMzIy4DQFyIXaXxFuEJxJMdf2nyjHK8Y\/qSmidEqlaUSEWKoFvGFjVYTgh3uEbYB406mH1Ebwh+CJpBpo1FMgtf27gE\/3RXkW1AQc5adKFY6v68aGWUn49qdr8\/6S88GUuxBzP3YBqlAWrs5Gemzy15gv\/Vu7oSRFDOJYaWcGziSYuboZOaNQLIbZ3YpF9pgPK3aR52N2aezu18jo7ZivrVXJ+NtOScrAprCCCbBJi3YF\/hHQ3prI9z\/MEXe4oE6QY3avOxH11UcinK9TYjRnejfYaRSdr4dP+QFGayFLx7jokmonyncWAHl\/CCsYT+N3hyuwp10yjdxh9WutEW9+SynT2NLjWkrijPPBprnNvVbs6N+s+Wrv7sFmH23mPNPFcnSQmO2LZNtK72NBs3C5HT\/Ci7nTnJ6pl3LA0tmRX9SD+n1+wXhUlRo5G901KGKThIqgCpgOLXrAdhblRk20QRyoD4D17KrGSgyyakGk3WvSiQkqotflDMX3gaw5OpMibMgslaxfsf8Ameg2ynOxAl0AAAAASUVORK5CYII=\"alt=\"\">'
        }

        html += '<td class=\"date\" valign=\"top\">\r\n                                    <h5 class=\"date-doc\" id=\"documentDate\">' + signingDate +  '<br>'+ signingTime +'<br><br>'+ verificationText +'<\/h5>\r\n                                 <td>\r\n                                    <table>\r\n<tr>\r\n   <td>\r\n      <h1 class=\"info\">Signed by: <\/h1>\r\n   <\/td>\r\n   <td>\r\n      <p id=\"documentSignersName\">' + currentSigner.identityObj.name + ' (inputted by the signer)<\/p>\r\n   <\/td>\r\n<\/tr>\r\n<tr>\r\n   <td>\r\n      <h1 class=\"info\">Email: <\/h1>\r\n   <\/td>\r\n   <td>\r\n      <p id=\"documentOwnersEmail\">' + currentSigner.identityObj.email + ' (verified)<\/p>\r\n   <\/td>\r\n<\/tr>\r\n<tr>\r\n   <td>\r\n      <h1 class=\"info\">Phone Number: <\/h1>\r\n   <\/td>\r\n   <td>\r\n      <p id=\"documentOwnersPhone\">' + currentSigner.identityObj.phone_number + ' (SMS verified)<\/p>\r\n   <\/td>\r\n<\/tr>\r\n'

        if (addedSigners.indexOf("@") >= 0) {
            html += '<tr>\r\n   <td style=\" vertical-align: top !important;\">\r\n <h1 class=\"info\">Added Signers:<\/h1>\r\n   <\/td>\r\n   <td>\r\n      <p >' + addedSigners + '<\/p>\r\n   <\/td>\r\n<\/tr>\r\n '
        }

        html += '<tr>\r\n   <td style=\" vertical-align: top !important;\">\r\n      <h1 class=\"info\"> Signature hash: <\/h1>\r\n   <\/td>\r\n   <td>\r\n      <p id=\"signature_data\">' + currentSigner.base64SigHash + '<\/p>\r\n   <\/td>\r\n<\/tr>\r\n                                    <\/table>'
        if (currentSigner.verified === true) {
            html += "<p class=\"verified\">This PDF and the information above has been re-generated locally and then matched against what was posted to the <a class=\"linkP\"href=\" " + currentSigner.stellarTx + "\" >Stellar Blockchain on " + postingDate + " at "+ postingTime +"</a>. <\/p>\r\n"
        } else {
            html += '<p class=\"verified not-verified\">This signature could not be verified<\/p>\r\n'
        }
        html += ' <\/table>'
    };
    html += '</div>'

    document.getElementById("document-signatures").innerHTML = html;

};


