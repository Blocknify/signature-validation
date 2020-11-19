	var sha256 = document.createElement('script');
	sha256.src = 'dist/sha256.min.js';
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

		let dependencies = []
		var fnArray = operatorList.fnArray;
		var fnArrayLen = fnArray.length;
		var argsArray = operatorList.argsArray;

		for (var i = 0; i < fnArrayLen; i++) {
			if (OPT_DEPENDENCY === fnArray[i]) {
				var deps = argsArray[i];
				for (var n = 0, nn = deps.length; n < nn; n++) {
					var obj = deps[n];
					var common = obj.substring(0, 2) === 'g_';
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

		let blobs = []
		var unloadedBlobsLen = unloadedBlobs.length;
		for (var i = 0; i < unloadedBlobsLen; i++) {
			blobs.push(new Promise(function (resolve) {
				fetch(unloadedBlobs[i].currentSrc).then(function (res) { return res.arrayBuffer() }).then(resolve)
			}))
		}
		return Promise.all(blobs)
	}

	function getPageContent(commonObjs, objs, operatorList, annotationsData) {

		return new Promise(function (resolve) {

			var g = 0
			var resources = {}
			var unloadedBlobs = []
			var unloadedBlobsKeys = []
			var resourcesRename = {}

			loadDependencies(commonObjs, objs, operatorList).then(function (values) {

				var fnArray = operatorList.fnArray;
				var fnArrayLen = fnArray.length;
				var argsArray = operatorList.argsArray;

				for (var i = 0; i < fnArrayLen; i++) {

					if (OPT_DEPENDENCY === fnArray[i]) {
						var deps = argsArray[i];
						for (var n = 0, nn = deps.length; n < nn; n++) {

							var obj = deps[n];

							var common = obj.substring(0, 2) === 'g_';
							var promise;
							var value;

							if (!resourcesRename[obj]) {

								// rename commonObjs resources
								var resourceName = obj

								if (common) {
									resourceName = 'resource-' + g++
									operatorList.argsArray[i][n] = resourceName
									value = commonObjs.get(obj);
								} else {
									value = objs.get(obj);
								}

								// add only objs that have data or src
								if (value.data) {
									resources[resourceName] = value.data

								} else if (value.currentSrc) {
									unloadedBlobs.push(value)
									unloadedBlobsKeys.push(resourceName)
								}

								resourcesRename[obj] = resourceName

							} else {

								operatorList.argsArray[i][n] = resourcesRename[obj]

							}

						}
					} else if (Array.isArray(argsArray[i])) {
						// rename resources when used
						var deps = argsArray[i];
						for (var n = 0, nn = deps.length; n < nn; n++) {
							if (resourcesRename[operatorList.argsArray[i][n]]) {
								operatorList.argsArray[i][n] = resourcesRename[operatorList.argsArray[i][n]]
							}
						}
					}
				}

				loadBlobs(unloadedBlobs).then(function (values) {
					for (var i in unloadedBlobsKeys) {
						resources[unloadedBlobsKeys[i]] = values[i]
					}
					resolve({ resources, operatorList, annotationsData })
				})

			})

		})

	}



	function hasBlocknifyQRCode(pageContent) {


		var found = false

		for (var i in pageContent.resources)
			//check if it is a part of QR code (hash of blocknify logo)
			if (pageContent.resources[i] == "8b8cd8274c8f89d0ebf7a67ebbd657dedf0687f3db08d65de6cd0b9314b09001")
				found = true

		if (!found) {
			console.log("No blocknify logo found")
			return -1
		}

		for (var last_index = pageContent.operatorList.fnArray.length - 1; last_index >= 24; last_index--) {

			if (pageContent.operatorList.fnArray[last_index] != 11)
				continue

			var found = (function (last_index) {

				if (last_index - 24 < 0)
					return -1

				// Blocknify QR code contents 
				var fnArrayQR = [10, 12, 74, 10, 12, 74, 10, 12, 1, 85, 11, 75, 11, 10, 12, 74, 10, 12, 1, 85, 11, 75, 11, 75, 11]
				var argsArrayQR = [null, [1, 0, 0, 1, 0, 0], [null, [0, 0, 612, 792]], null, [0.05, 0, 0, 0.05, 22, 22], [null, [0, 0, 500, 600]], null, [500, 0, 0, 600, 0, 0], ["img_p0_13"], ["img_p0_13", 500, 600], null, [], null, null, [0.02875, 0, 0, 0.02875, 23.25, 28.25], [null, [0, 0, 800, 800]], null, [800, 0, 0, 800, 0, 0], ["img_p0_14"], ["img_p0_14", 800, 800], null, [], null, [], null]

				for (var i = 0, j = last_index - 24; i < 24; i++, j++) {

					if (pageContent.operatorList.fnArray[j] != fnArrayQR[i]) {
						return -1
					}

					if (i == 8) {
						if ("8b8cd8274c8f89d0ebf7a67ebbd657dedf0687f3db08d65de6cd0b9314b09001" != pageContent.resources[pageContent.operatorList.argsArray[j][0]])
							return -1
					}

				}

				for (var i = 0, j = last_index - 24; i < 24; i++, j++) {

					if (i != 2 && i != 8 && i != 9 && i != 18 && i != 19) {
						if (JSON.stringify(pageContent.operatorList.argsArray[j]) != JSON.stringify(argsArrayQR[i])) {
							return -1
						}
					}

				}

				console.log("Blocknify QR Code Found", last_index)

				return last_index

			})(last_index)

			if (found != -1)
				return found

		}

		return -1

	}

	function removeBlocknifyQRCode(pageContent, last_index) {

		if (last_index - 24 < 0)
			return pageContent

		delete pageContent.resources[pageContent.operatorList.argsArray[last_index - 24 + 8][0]]
		delete pageContent.resources[pageContent.operatorList.argsArray[last_index - 24 + 18][0]]

		pageContent.operatorList.argsArray.splice(last_index - 24, 25)
		pageContent.operatorList.fnArray.splice(last_index - 24, 25)

		return pageContent

	}


	function generatePageHash(page) {

		return new Promise(function (resolve) {

			page.getAnnotations().then(function (annotationsData) {

				page.getOperatorList()
					.then(function (opList) {

						getPageContent(page.commonObjs, page.objs, opList, annotationsData)
							.then(({ resources, operatorList, annotationsData }) => {

								for (var i in resources) {
									resources[i] = sha256(resources[i])
								}

								if (Object.keys(resources)[0] && resources[Object.keys(resources)[0]] == 'cf90d646f3de5715fb93d5025fca26a37e7f81d7165bf9ee34157c1586e595f4') {
									// beter detection
									return resolve(null)
								}

								var pageContent = {
									resources: sortOnKeys(resources),
									operatorList: opList,
									annotationsData: annotationsData
								}

								var lastIndex = hasBlocknifyQRCode(pageContent)
								if (lastIndex != -1)
								pageContent = removeBlocknifyQRCode(pageContent, lastIndex)

								var hash = sha256(JSON.stringify(sortOnKeys(pageContent)))

								resolve(hash)

							}).catch((error) => {
								console.error("Error getting page content", error);
							})
					}).catch((error) => {
						console.error("Error fetching op list", error);
					})
			}).catch((error) => {
				console.error("Error fetching annotations data", error);
			})

		})

	}

	function hashPDFDocument(data, callback, progress) {

		const getNumberOfPages = (filteredPNGImagesArray, originalNumberOfPages) => {
			if (!filteredPNGImagesArray.length || originalNumberOfPages === 1) {
				return originalNumberOfPages;
			}

			const findBlocknifyImage = sha256(filteredPNGImagesArray[1])
			
			if (findBlocknifyImage === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") {				
				return originalNumberOfPages - 1;
			} 

			return originalNumberOfPages;
        };
        
		pdfjsLib.getDocument(data).promise
			.then(async function (pdf) {

				var unhashedPages = []
				var hashed_pages = 0
				const lastPage = await pdf.getPage(pdf.numPages);
				const lastPageOperatorList = await lastPage.getOperatorList();
				let images = [];
				for (let i = 0; i < lastPageOperatorList.fnArray.length; i++) {
					if (lastPageOperatorList.fnArray[i] == pdfjsLib.OPS.paintImageXObject) {
						images.push(lastPageOperatorList.argsArray[i][0]);
					}
				}
				const filteredPNGImagesData = images.map(image => lastPage.objs.get(image));
				const numberOfPages = getNumberOfPages(filteredPNGImagesData, pdf.numPages);

				for (var i = 1; i <= numberOfPages; i++)
					unhashedPages.push(
						new Promise(function (resolve) {
							pdf.getPage(i).then(function (page) {
								generatePageHash(page).then(function (hash) {
									if (progress)
										progress({ total_pages: unhashedPages.length, hashed_pages: ++hashed_pages })
									resolve(hash)
								})
							})
						})
					)

				return Promise.all(unhashedPages)

			})
			.then(function (pageHashes) {

				pageHashes = pageHashes.filter((item) => {
					return item != null
				})

				callback(sha256(JSON.stringify(pageHashes)))

			})

	}
