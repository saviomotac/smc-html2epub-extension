// Preenche os campos de título e autor com os valores da página atual
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        // Obtém título e autor da página
        const title = document.title;
        const authorMeta = document.querySelector('meta[name="author"]');
        const author = authorMeta ? authorMeta.content : "Autor Desconhecido";
        return { title, author };
      }
    }, (results) => {
      chrome.storage.local.get(["epubTitle", "epubAuthor"], (resultLocal) => {

        if (resultLocal.epubTitle) {
          document.getElementById("epub-title").value = resultLocal.epubTitle || "";
        } else {
          if (results && results[0] && results[0].result) {
            document.getElementById('epub-title').value = results[0].result.title || '';
          }
        }

        if (resultLocal.epubAuthor) {
          document.getElementById("epub-author").value = resultLocal.epubAuthor || "";
        } else {
          if (results && results[0] && results[0].result) {
            document.getElementById('epub-author').value = results[0].result.author || '';
          }
        }
      });
    });
  });

// Recupera os valores salvos e preenche os campos ao abrir o popup
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["epubTitle", "epubAuthor"], (result) => {
    document.getElementById("epub-title").value = result.epubTitle || ""; // Valor salvo ou vazio
    document.getElementById("epub-author").value = result.epubAuthor || ""; // Valor salvo ou vazio
  });
});

// Atualiza o armazenamento local sempre que os campos forem modificados
document.getElementById("epub-title").addEventListener("input", (event) => {
  chrome.storage.local.set({ epubTitle: event.target.value });
});

document.getElementById("epub-author").addEventListener("input", (event) => {
  chrome.storage.local.set({ epubAuthor: event.target.value });
});  

document.getElementById("convert-page").addEventListener("click", async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => document.documentElement.outerHTML // Captura todo o HTML da página
      }, (results) => {
        extractDataAndGenerate(results);
      });
    });
});

document.getElementById("convert-selection").addEventListener("click", async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
            const selection = window.getSelection();
            if (!selection.rangeCount) return null;
    
            // Cria um container temporário para capturar o HTML da seleção
            const container = document.createElement('div');
            for (let i = 0; i < selection.rangeCount; i++) {
              const range = selection.getRangeAt(i);
              container.appendChild(range.cloneContents());
            }
    
            return container.innerHTML; // Retorna o HTML da seleção
          }
      }, (results) => {
        extractDataAndGenerate(results);
      });
    });
});

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.random() * 16 | 0; // Gera um número aleatório entre 0 e 15
      const value = char === 'x' ? random : (random & 0x3 | 0x8); // Ajusta 'y' para ser 8, 9, A ou B
      return value.toString(16); // Converte para hexadecimal
    });
}

function getCurrentISODate() {
    const now = new Date();

    // Formata a data no formato YYYY-MM-DD
    const date = now.toISOString().split('T')[0];

    // Retorna no formato YYYY-MM-DDT00:00:00Z
    return `${date}T00:00:00Z`;
}  

function adjustTextBold(htmlContent) {
    const container = document.createElement('div');
    container.innerHTML = htmlContent;

    container.querySelectorAll('p', container).forEach((p) => {
        const text = p.textContent.trim();
        if (/^(CAPÍTULO|Seção)/i.test(text)) {
            // Aplica o estilo bold ao elemento <p>
            p.style.fontWeight = 'bold';

            // Aplica o estilo bold ao elemento imediatamente posterior, se existir
            const nextElement = p.nextElementSibling;
            if (nextElement) {
            nextElement.style.fontWeight = 'bold';
            }
        }
    });

    return container.innerHTML;
}

function extractDataAndGenerate(results) {
    if (results && results[0] && results[0].result) {
        
        title = document.getElementById('epub-title').value;
        title = title ? title : 'ebook';

        author = document.getElementById('epub-author').value
        uuid = generateUUID();
        date = getCurrentISODate();
        generateEPUB(title, author, uuid, date, adjustTextBold(results[0].result));
    } else {
      console.error("Erro ao capturar o conteúdo da página.");
    }
}
  
function generateEPUB(title, author, uuid, date, htmlContent) {
    const zip = new JSZip();
  
    // Adiciona o arquivo 'mimetype' (obrigatório)
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    zip.folder("META-INF").file(
        "container.xml", `<?xml version="1.0" encoding="UTF-8"?>
         <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
            <rootfiles>
                <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
            </rootfiles>
         </container>
         `);
  
    // Adiciona o diretório META-INF e o arquivo container.xml
    zip.file("toc.ncx", `<?xml version='1.0' encoding='utf-8'?>
        <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="eng">
        <head>
            <meta content="5cb691a0-6b67-4ed1-9ba1-87c98ebe95b2" name="dtb:uid"/>
            <meta content="2" name="dtb:depth"/>
            <meta content="calibre (4.99.5)" name="dtb:generator"/>
            <meta content="0" name="dtb:totalPageCount"/>
            <meta content="0" name="dtb:maxPageNumber"/>
        </head>
        <docTitle>
            <text>e4f1618e87ce49ae89f2e493efefd911</text>
        </docTitle>
        <navMap>
            <navPoint id="uZbD79y8yRr2BagPpXbOoY7" playOrder="1">
            <navLabel>
                <text>Start</text>
            </navLabel>
            <content src="index.html"/>
            </navPoint>
        </navMap>
        </ncx>
    `);
  
    // Adiciona o diretório content com o arquivo content.opf e conteúdo HTML
    zip.file("content.opf", `<?xml version="1.0" encoding="utf-8"?>
        <package version="2.0" unique-identifier="uuid_id" xmlns="http://www.idpf.org/2007/opf">
        <metadata xmlns:calibre="http://calibre.kovidgoyal.net/2009/metadata" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:opf="http://www.idpf.org/2007/opf" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <dc:language>pt</dc:language>
            <dc:title>${title}</dc:title>
            <dc:creator opf:file-as="${author}" opf:role="aut">${author}</dc:creator>
            <dc:contributor opf:role="bkp" />
            <meta name="calibre:timestamp" content="2024-12-07T00:42:45.669926+00:00" />
            <dc:identifier id="uuid_id" opf:scheme="uuid">${uuid}</dc:identifier>
            <meta name="Sigil version" content="2.3.1" />
            <dc:date opf:event="modification" xmlns:opf="http://www.idpf.org/2007/opf">${date}</dc:date>
        </metadata>
        <manifest>
            <item id="id1" href="index.html" media-type="application/xhtml+xml"/>
            <item id="css" href="stylesheet.css" media-type="text/css"/>
            <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        </manifest>
        <spine toc="ncx">
            <itemref idref="id1"/>
        </spine>
        </package>
      `);
    zip.file("index.html", `<!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>${title}</title>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `);
    
    zip.file("stylesheet.css", `
        @page {
            margin-bottom: 5pt;
            margin-top: 5pt
        }
        .calibre {
            display: block;
            font-size: 1em;
            padding-left: 0;
            padding-right: 0;
            margin: 0 5pt
        }
        .calibre1 {
            display: block;
            margin: 1em 0
        }
        .calibre2 {
            font-weight: bold
        }
        .calibre3 {
            font-style: italic
        }
    `);
  
    // Gera o EPUB como um Blob
    zip.generateAsync({ type: "blob" }).then((blob) => {
        const typedBlob = new Blob([blob], {type: 'application/octet-stream'});
  
        // Baixa o arquivo EPUB
        chrome.downloads.download({
            url: URL.createObjectURL(typedBlob),
            filename: "ebook.epub"
        });
    }).catch((error) => {
      console.error("Erro ao gerar o EPUB:", error);
    });
  }
  