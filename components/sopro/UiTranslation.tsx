import {useEffect} from 'react';
import {translateUi,type Language} from '@/core/i18n/ui';

const textSource=new WeakMap<Text,string>();
const attributeSource=new WeakMap<Element,Map<string,string>>();
const attributes=['aria-label','title','placeholder'];

function translateText(node:Text,language:Language){
 const current=node.data;
 let source=textSource.get(node);
 if(source===undefined||(current!==source&&current!==translateUi(source))){source=current;textSource.set(node,source);}
 const next=language==='en'?translateUi(source):source;
 if(current!==next)node.data=next;
}
function translateElement(element:Element,language:Language){
 let sources=attributeSource.get(element);if(!sources){sources=new Map();attributeSource.set(element,sources);}
 for(const attribute of attributes){const current=element.getAttribute(attribute);if(current===null)continue;let source=sources.get(attribute);if(source===undefined||(current!==source&&current!==translateUi(source))){source=current;sources.set(attribute,source);}const next=language==='en'?translateUi(source):source;if(current!==next)element.setAttribute(attribute,next);}
}
function translateTree(root:Node,language:Language){
 if(root.nodeType===Node.TEXT_NODE){translateText(root as Text,language);return;}
 if(root.nodeType===Node.ELEMENT_NODE)translateElement(root as Element,language);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let node:Node|null;
 while((node=walker.nextNode()))node.nodeType===Node.TEXT_NODE?translateText(node as Text,language):translateElement(node as Element,language);
}

export default function UiTranslation({language}:{language:Language}){
 useEffect(()=>{
  document.documentElement.lang=language==='en'?'en':'pt-BR';
  let observer:MutationObserver;
  const observe=()=>observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
  observer=new MutationObserver(mutations=>{observer.disconnect();for(const mutation of mutations){if(mutation.type==='childList')mutation.addedNodes.forEach(node=>translateTree(node,language));else translateTree(mutation.target,language);}observe();});
  translateTree(document.body,language);observe();
  return()=>observer.disconnect();
 },[language]);
 return null;
}
