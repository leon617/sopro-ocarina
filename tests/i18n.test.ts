import {describe,expect,it} from 'vitest';
import {translateUi} from '../core/i18n/ui';

describe('English interface translation',()=>{
 it('translates fixed labels and dynamic musical text',()=>{
  expect(translateUi('Biblioteca')).toBe('Library');
  expect(translateUi('12 compassos')).toBe('12 measures');
  expect(translateUi('Compasso 4')).toBe('Measure 4');
  expect(translateUi('0,5 tempos')).toBe('0.5 beats');
  expect(translateUi('Ocarina · Voz 1 / pauta 1 · voz original')).toBe('Ocarina · Voice 1 / staff 1 · original voice');
 });
});
