// Noms de fichiers explicites pour les téléchargements de l'application.
// Ce fichier ne modifie ni les données Supabase, ni les calculs des bilans.
(() => {
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

  function renameDownload(name) {
    name = clean(name);
    let m;

    if ((m = name.match(/^bilan-general-(\d{4})\.pdf$/i)))
      return `Bilan_global_Amicale_SP_Volvic_${m[1]}.pdf`;

    if ((m = name.match(/^bilans-equipes-(\d{4})\.pdf$/i)))
      return `Bilans_par_equipe_Amicale_SP_Volvic_${m[1]}.pdf`;

    if ((m = name.match(/^registre-recus-(\d{4})\.pdf$/i)))
      return `Registre_des_recus_Amicale_SP_Volvic_${m[1]}.pdf`;

    if ((m = name.match(/^bilan-calendriers-(\d{4})\.xlsx$/i)))
      return `Bilan_complet_Amicale_SP_Volvic_${m[1]}.xlsx`;

    if ((m = name.match(/^registre-recus-(\d{4})\.csv$/i)))
      return `Registre_des_recus_Amicale_SP_Volvic_${m[1]}.csv`;

    if ((m = name.match(/^bilans-equipes-(\d{4})\.csv$/i)))
      return `Bilans_par_equipe_Amicale_SP_Volvic_${m[1]}.csv`;

    if ((m = name.match(/^bilan-total-(\d{4})\.csv$/i)))
      return `Bilan_global_Amicale_SP_Volvic_${m[1]}.csv`;

    if ((m = name.match(/^archive-complete-calendriers-(\d{4})\.csv$/i)))
      return `Archive_complete_Amicale_SP_Volvic_${m[1]}.csv`;

    if ((m = name.match(/^tournees-(\d{4})\.csv$/i)))
      return `Visites_detaillees_Amicale_SP_Volvic_${m[1]}.csv`;

    return name;
  }

  // PDF jsPDF
  function patchJsPdf() {
    const api = window.jspdf?.jsPDF?.API;
    if (!api || api.__aspvNamesPatched || typeof api.save !== 'function') return;
    const original = api.save;
    api.save = function(filename, options) {
      return original.call(this, renameDownload(filename), options);
    };
    api.__aspvNamesPatched = true;
  }

  // Excel SheetJS
  function patchXlsx() {
    if (!window.XLSX || window.XLSX.__aspvNamesPatched || typeof window.XLSX.writeFile !== 'function') return;
    const original = window.XLSX.writeFile;
    window.XLSX.writeFile = function(workbook, filename, options) {
      return original.call(this, workbook, renameDownload(filename), options);
    };
    window.XLSX.__aspvNamesPatched = true;
  }

  // CSV / téléchargements par balise <a>
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {
    if (this.download) this.download = renameDownload(this.download);
    return originalClick.call(this);
  };

  patchJsPdf();
  patchXlsx();
  window.addEventListener('load', () => {
    patchJsPdf();
    patchXlsx();
  });
})();
