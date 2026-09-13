export type CatalogSort = 'relevance' | 'title' | 'popularity';
export interface CatalogOptions {sort?:CatalogSort;page?:number;importableOnly?:boolean}
export interface CatalogResult {
 id:string;source:string;title:string;composer:string;author:string;license:string;licenseUrl?:string;
 work?:string;formats:string[];pageUrl:string;fileUrl?:string;importable:boolean;
 popularity?:{value:number;label:string};warning?:string;
}
export interface CatalogPage {results:CatalogResult[];total:number;page:number;pageSize:number;fetchedAt:string;source:string;sort:CatalogSort}
export interface CatalogFile {name:string;format:'MXL'|'MusicXML'|'MIDI';url:string;size?:number}
export interface CatalogConnector {
 id:string;name:string;sorts:CatalogSort[];
 search(query:string,options?:CatalogOptions):Promise<CatalogPage>;
 files(id:string):Promise<CatalogFile[]>;
 download(id:string,file?:string):Promise<{bytes:Uint8Array;name:string}>;
}
export const catalogSources = [
 {id:'ichigos',name:'Ichigo’s · jogos e anime',description:'Temas geek em MIDI · uso não comercial',sorts:['relevance','title'] as CatalogSort[]},
 {id:'zelda-central',name:'Zelda Central MIDI',description:'Temas de Zelda em MIDI',sorts:['relevance','title'] as CatalogSort[]},
 {id:'pdmx',name:'PDMX · domínio público',description:'Amostra curada em MXL · sem conflito de licença',sorts:['relevance','title'] as CatalogSort[]},
 {id:'openscore',name:'OpenScore Lieder',description:'Canções em MXL · edições CC0',sorts:['relevance','title'] as CatalogSort[]},
 {id:'internet-archive',name:'Internet Archive · PublicJukebox',description:'Partituras históricas · MusicXML e PDF',sorts:['relevance','popularity','title'] as CatalogSort[]},
 {id:'vgleadsheets',name:'VGLeadSheets · indisponível',description:'Índice geek · PDF não importável',sorts:['relevance','title'] as CatalogSort[],disabled:true},
 {id:'vgmusic',name:'VGMusic · indisponível',description:'Ligação direta não permitida',sorts:['relevance','title'] as CatalogSort[],disabled:true},
 {id:'ninsheetmusic',name:'NinSheetMusic · indisponível',description:'Verificação antirobô',sorts:['relevance','title'] as CatalogSort[],disabled:true},
];
