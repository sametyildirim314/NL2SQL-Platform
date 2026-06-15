/**
 * Verilen tablo verisini (dizi içerisindeki nesneler) CSV formatında indirir.
 * 
 * @param {Array<Object>} dataRows - İndirilecek verilerin dizisi
 * @param {Array<String>} tableColumns - Tablo kolonlarının isimleri
 * @param {String} filename - İndirilecek dosyanın adı
 */
export function downloadAsCsv(dataRows, tableColumns, filename = "sorgu_sonucu.csv") {
  if (!dataRows || !dataRows.length || !tableColumns || !tableColumns.length) return;

  // CSV başlık satırı (Excel'in Türkçe sürümünde sütunları ayırmak için noktalı virgül kullanılır)
  const headers = tableColumns.join(";");

  // Veri satırları
  const csvRows = dataRows.map(row => {
    return tableColumns.map(col => {
      let cellData = row[col] === null || row[col] === undefined ? "" : String(row[col]);
      
      // Hücre verisinde noktalı virgül, tırnak veya yeni satır varsa çift tırnak içine al
      // İçindeki çift tırnakları da iki kez yazarak (escape) sorun çıkmasını engelle
      if (cellData.includes(";") || cellData.includes("\"") || cellData.includes("\n")) {
        cellData = `"${cellData.replace(/"/g, '""')}"`;
      }
      
      return cellData;
    }).join(";");
  });

  // UTF-8 BOM ekleyerek Türkçe karakter sorununun (Örn: ş, ğ, ı) Excel'de çözülmesi sağlanır
  const bom = "\uFEFF";
  const csvString = bom + [headers, ...csvRows].join("\n");

  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
