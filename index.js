const fs = require('fs');
const path = require("node:path");


const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

let globalJsonOutput = [];

const dateFormat = (timeStamp) => {
    return Intl.DateTimeFormat('en-CA', {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(timeStamp)
}

const getName = (string) => {
    return string.split('.')?.[0]
        .replaceAll(/[-_.]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
}

const createDirectory = (baseName) => {
    let timestamp = Date.now();
    let directoryPath = path.join(`${baseName}Database${timestamp}`);

    try {
      fs.mkdirSync(directoryPath);
      return directoryPath;
    } catch (err) {
      console.error(`Erro ao criar o diretório: ${err}`);
      return null;
    }
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

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const getFileInfo = ({ parentFolderName, file, folder, size, dateTime, rootFolder }) => {
    const extension = file.split('.').pop();
    const fileName = file.replaceAll(/ /g, '_');
    const name = getName(fileName)
    const model  = getModel(file)
    const rootPath = '/content/dam/firstdata/softwareexpress/pt_br/franqueados-se/downloads'
    const childFolderName = convertToSlug(folder)
    const thumbnailPath = `/content/dam/firstdata/softwareexpress/pt_br/franqueados-se/thumbs/${model.toLowerCase()}.png`

    const filePath = `${rootPath}/${rootFolder}/${childFolderName}/${file}`;

    return {
        name: name,
        category: folder,
        type: extension,
        date: dateTime,
        model: model,
        size: formatBytes(size),
        download: filePath,
        thumbnail: thumbnailPath
    };
}

console.log('1 - Localize o seu arquivo, clique nele e selecione a opção de "copiar como caminho" \n2 - Cole no terminal abaixo.\n3 - Pressione "Enter"\n')
readline.question('Por favor, insira o caminho do diretório que deseja acessar e aperte "Enter":\n', directoryPath => {
    console.log('Processando...')
    // const concatDirectoryPath = path.join('public', directoryPath);
    const concatDirectoryPath = directoryPath.replace(/"/g, '');
    const startTime = Date.now();
    const rootFolder = concatDirectoryPath.split('\\').pop()?.toLowerCase()

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
                                                    size: stats.size,
                                                    dateTime: dateFormat(stats.mtime),
                                                    rootFolder
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
                const databasePath = createDirectory(concatDirectoryPath);
                if (databasePath) {
                    const filePath = path.join(databasePath, 'database.json');
                     fs.writeFile(filePath, JSON.stringify(globalJsonOutput, null, 4), (err) => {
                    if (err) {
                        console.error("Ocorreu um erro:", err);
                    }
                });
                }

                let endTime = Date.now();
                let timeSpent = (endTime - startTime) / 1000;

                console.log(`Arquivo database.json criado em ${databasePath}`)
                console.log('Finalizado com Sucesso!');
                console.log(`Tempo de execução: ${timeSpent} segundos`);
            }).catch(err => {
                console.error("Ocorreu um erro:", err);
            });
        }
    });
    readline.close();
});