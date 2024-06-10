const fs = require('fs');
const path = require("node:path");

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const dateFormat = (timeStamp) => {
    return Intl.DateTimeFormat('en-US', {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(timeStamp)
}

const getName = (string) => {
    return string
        .split('.')?.[0]
        .replaceAll(/[-_.]/g, ' ')
        .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

const getModel = (string) => {
    return string
        .split('.')?.[0]
        .replaceAll(/[-_.]/g, ' ')
        .split(' ')?.[0]
        .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

const convertToSlug = (value) => {
    return value.replaceAll(' ', '-').toLowerCase()
}

const getFileInfo = ({ parentFolderName, file, folder, path, dateTime }) => {
    const extension = file.split('.').pop();
    const fileName = file.replaceAll(/ /g, '_');
    const name = getName(fileName)
    const model  = getModel(file)
    const rootPath = '/content/dam/firstdata/bin/pt_br/assets/franqueados/downloads'
    const childFolderName = convertToSlug(folder)

    const filePath = `${rootPath}/${parentFolderName}/${childFolderName}/${fileName}`;

    return {
        name: name,
        category: folder,
        type: extension,
        date: dateTime,
        model: model,
        download: filePath,
        thumbnail: ''
    };
}

let globalJsonOutput = [];
let globalJsonOutputObject = {};
readline.question('Por favor coloque o diretorio: ', directoryPath => {
    console.log('Processando...')
    const concatDirectoryPath = path.join('public', directoryPath);
    const startTime = Date.now();
    fs.readdir(concatDirectoryPath, (err, folders) => {
        if (err) {
            console.error("Ocorreu um erro:", err);
        } else {
            const totalFolders = folders.length;
            let processedFolders = 0;

            let folderReadPromises = folders.map(folder => {
                return new Promise((resolve, reject) => {
                    const path = `${concatDirectoryPath}/${folder}`;
                    fs.readdir(path, (err, files) => {
                        if (err) {
                            reject("Ocorreu um erro:", err);
                        } else {
                            let fileStatPromises = files.map(file => {
                                return new Promise((resolve, reject) => {
                                    fs.stat(`${path}/${file}`, (err, stats) => {
                                        if (err) {
                                            reject("Ocorreu um erro:", err);
                                        } else {
                                            resolve(
                                                getFileInfo({
                                                    parentFolderName: directoryPath,
                                                    file,
                                                    folder,
                                                    path,
                                                    dateTime: dateFormat(stats.mtime)
                                                })
                                            );
                                        }
                                    });
                                });
                            });

                            Promise.all(fileStatPromises).then(values => {
                                processedFolders++;
                                const percentage = Math.round((processedFolders / totalFolders) * 100);
                                console.log(`Progress: ${percentage}%`);
                                resolve(values);
                            }).catch(err => {
                                reject("Ocorreu um erro:", err);
                            });
                        }
                    });
                });
            });

            Promise.all(folderReadPromises).then(values => {
                globalJsonOutput = [].concat.apply([], values);
                fs.writeFile(`./database.json`, JSON.stringify(globalJsonOutput, null, 4), (err) => {
                    if (err) {
                        console.error("Ocorreu um erro:", err);
                    }
                });

                let endTime = Date.now();
                let timeSpent = (endTime - startTime) / 1000;

                console.log('Finalizado com Sucesso!');
                console.log(`Tempo de execução: ${timeSpent} segundos`);
            }).catch(err => {
                console.error("Ocorreu um erro:", err);
            });
        }
    });
    readline.close();
});