// Limpa o armazenamento local ao carregar a página
chrome.storage.local.clear(() => {
  if (chrome.runtime.lastError) {
    console.error("Erro ao limpar o armazenamento:", chrome.runtime.lastError);
  } else {
    console.log("chrome.storage.local foi limpo com sucesso!");
  }
});