import {test,expect} from '@playwright/test';
test('new library, preview, practice and install controls preserve the existing flow',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://en.wikipedia.org/**',route=>route.abort());
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Jardim ao anoitecer',exact:true})).toBeVisible();
 await expect(page.locator('.song-card .cover-fallback')).toBeVisible();
 await expect(page.getByRole('button',{name:'Instalar Sopro'})).toHaveCount(0);
 await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});Object.assign(e,{prompt:async()=>{}});window.dispatchEvent(e);});
 await expect(page.getByRole('button',{name:'Instalar Sopro'})).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
 await expect(page.getByRole('button',{name:'Instalar Sopro'})).toHaveCount(0);
 await page.getByRole('button',{name:'Sobre o Sopro'}).click();
 await expect(page.getByRole('dialog')).toContainText('Manu Zancatt');
 await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('combobox',{name:'Progresso da música'}).click();await page.getByRole('option',{name:'Quase pronta',exact:true}).click();
 await page.reload();await expect(page.getByRole('combobox',{name:'Progresso da música'})).toContainText('Quase pronta');
 await page.getByRole('textbox',{name:'Buscar músicas'}).fill('jardim ao anoitecer');await expect(page.locator('.song-card')).toHaveCount(1);
 await page.getByRole('button',{name:'Jardim ao anoitecer',exact:true}).click();await page.getByRole('button',{name:'Ajustar melodia'}).click();
 await expect.poll(()=>page.locator('.preview-score .preview-note').count()).toBeGreaterThan(20);
 await expect(page.getByRole('combobox',{name:'Adaptação para ocarina'})).toContainText('Preservar tonalidade ao máximo');
 await page.getByRole('combobox',{name:'Adaptação para ocarina'}).click();await page.getByRole('option',{name:'Preservar tonalidade ao máximo'}).click();
 await page.getByRole('switch',{name:'Simplificar música'}).click();
 await page.getByRole('button',{name:'Ouvir prévia'}).click();await expect(page.getByRole('button',{name:'Pausar prévia'})).toBeVisible();
 await page.getByRole('button',{name:'Salvar e praticar'}).click();await page.getByRole('button',{name:'Praticar',exact:true}).click();
 await page.getByRole('switch',{name:'Mostrar pausas'}).click();await expect(page.getByRole('switch',{name:'Mostrar pausas'})).not.toBeChecked();
 await page.reload();await page.getByRole('button',{name:'Jardim ao anoitecer',exact:true}).click();await page.getByRole('button',{name:'Praticar',exact:true}).click();await expect(page.getByRole('switch',{name:'Mostrar pausas'})).not.toBeChecked();
 expect(errors).toEqual([]);
});

test('unusable catalogue sources are disabled at the end of the menu',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Explorar',exact:true}).click();
 await page.getByRole('combobox',{name:'Fonte de partituras'}).click();
 const options=page.getByRole('option'),count=await options.count();
 await expect(options.nth(count-3)).toBeDisabled();await expect(options.nth(count-2)).toBeDisabled();await expect(options.nth(count-1)).toBeDisabled();
 await expect(options.nth(count-1)).toContainText('NinSheetMusic');
});
