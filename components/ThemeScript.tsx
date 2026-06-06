export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('dnaexplorer.theme');if(t!=='light')t='dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
