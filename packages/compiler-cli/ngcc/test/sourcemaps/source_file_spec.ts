/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {encode} from 'sourcemap-codec';

import {FileSystem, absoluteFrom, getFileSystem} from '../../../src/ngtsc/file_system';
import {runInEachFileSystem} from '../../../src/ngtsc/file_system/testing';
import {RawSourceMap} from '../../src/sourcemaps/raw_source_map';
import {SourceFile, computeLineLengths, extractOriginalSegments, parseMappings} from '../../src/sourcemaps/source_file';

runInEachFileSystem(() => {
  describe('SourceFile and utilities', () => {
    let fs: FileSystem;
    let _: typeof absoluteFrom;

    beforeEach(() => {
      fs = getFileSystem();
      _ = absoluteFrom;
    });

    describe('parseMappings()', () => {
      it('should be an empty array for source files with no source map', () => {
        const mappings = parseMappings(null, []);
        expect(mappings).toEqual([]);
      });

      it('should be empty array for source files with no source map mappings', () => {
        const rawSourceMap: RawSourceMap = {mappings: '', names: [], sources: [], version: 3};
        const mappings = parseMappings(rawSourceMap, []);
        expect(mappings).toEqual([]);
      });

      it('should parse the mappings from the raw source map', () => {
        const rawSourceMap: RawSourceMap = {
          mappings: encode([[[0, 0, 0, 0], [6, 0, 0, 3]]]),
          names: [],
          sources: ['a.js'],
          version: 3
        };
        const originalSource = new SourceFile(_('/foo/src/a.js'), 'abcdefg', null, false, []);
        const mappings = parseMappings(rawSourceMap, [originalSource]);
        expect(mappings).toEqual([
          {
            generatedSegment: {line: 0, column: 0},
            originalSource,
            originalSegment: {line: 0, column: 0},
            name: undefined
          },
          {
            generatedSegment: {line: 0, column: 6},
            originalSource,
            originalSegment: {line: 0, column: 3},
            name: undefined
          },
        ]);
      });
    });

    describe('extractOriginalSegments()', () => {
      it('should return an empty array for source files with no source map',
         () => { expect(extractOriginalSegments(parseMappings(null, []))).toEqual([]); });

      it('should be empty array for source files with no source map mappings', () => {
        const rawSourceMap: RawSourceMap = {mappings: '', names: [], sources: [], version: 3};
        expect(extractOriginalSegments(parseMappings(rawSourceMap, []))).toEqual([]);
      });

      it('should parse the segments in ascending order of original position from the raw source map',
         () => {
           const originalSource = new SourceFile(_('/foo/src/a.js'), 'abcdefg', null, false, []);
           const rawSourceMap: RawSourceMap = {
             mappings: encode([[[0, 0, 0, 0], [2, 0, 0, 3], [4, 0, 0, 2]]]),
             names: [],
             sources: ['a.js'],
             version: 3
           };
           expect(extractOriginalSegments(parseMappings(rawSourceMap, [originalSource]))).toEqual([
             {line: 0, column: 0},
             {line: 0, column: 2},
             {line: 0, column: 3},
           ]);
         });
    });

    describe('SourceFile', () => {
      describe('flattenedMappings', () => {
        it('should be an empty array for source files with no source map', () => {
          const sourceFile =
              new SourceFile(_('/foo/src/index.js'), 'index contents', null, false, []);
          expect(sourceFile.flattenedMappings).toEqual([]);
        });

        it('should be empty array for source files with no source map mappings', () => {
          const rawSourceMap: RawSourceMap = {mappings: '', names: [], sources: [], version: 3};
          const sourceFile =
              new SourceFile(_('/foo/src/index.js'), 'index contents', rawSourceMap, false, []);
          expect(sourceFile.flattenedMappings).toEqual([]);
        });

        it('should be the same as non-flat mappings if there is only one level of source map',
           () => {
             const rawSourceMap: RawSourceMap = {
               mappings: encode([[[0, 0, 0, 0], [6, 0, 0, 3]]]),
               names: [],
               sources: ['a.js'],
               version: 3
             };
             const originalSource = new SourceFile(_('/foo/src/a.js'), 'abcdefg', null, false, []);
             const sourceFile = new SourceFile(
                 _('/foo/src/index.js'), 'abc123defg', rawSourceMap, false, [originalSource]);
             expect(sourceFile.flattenedMappings)
                 .toEqual(parseMappings(rawSourceMap, [originalSource]));
           });

        it('should merge mappings from flattened original source files', () => {
          const cSource = new SourceFile(_('/foo/src/c.js'), 'bcd123e', null, false, []);
          const bSourceMap: RawSourceMap = {
            mappings: encode([[[1, 0, 0, 0], [4, 0, 0, 3], [4, 0, 0, 6], [5, 0, 0, 7]]]),
            names: [],
            sources: ['c.js'],
            version: 3
          };
          const bSource =
              new SourceFile(_('/foo/src/b.js'), 'abcdef', bSourceMap, false, [cSource]);
          const aSourceMap: RawSourceMap = {
            mappings: encode([[[0, 0, 0, 0], [2, 0, 0, 3], [4, 0, 0, 2], [5, 0, 0, 5]]]),
            names: [],
            sources: ['b.js'],
            version: 3
          };
          const aSource =
              new SourceFile(_('/foo/src/a.js'), 'abdecf', aSourceMap, false, [bSource]);

          expect(aSource.flattenedMappings).toEqual([
            {
              generatedSegment: {line: 0, column: 1},
              originalSource: cSource,
              originalSegment: {line: 0, column: 0},
              name: undefined
            },
            {
              generatedSegment: {line: 0, column: 2},
              originalSource: cSource,
              originalSegment: {line: 0, column: 2},
              name: undefined
            },
            {
              generatedSegment: {line: 0, column: 3},
              originalSource: cSource,
              originalSegment: {line: 0, column: 3},
              name: undefined
            },
            {
              generatedSegment: {line: 0, column: 3},
              originalSource: cSource,
              originalSegment: {line: 0, column: 6},
              name: undefined
            },
            {
              generatedSegment: {line: 0, column: 4},
              originalSource: cSource,
              originalSegment: {line: 0, column: 1},
              name: undefined
            },
            {
              generatedSegment: {line: 0, column: 5},
              originalSource: cSource,
              originalSegment: {line: 0, column: 7},
              name: undefined
            },
          ]);
        });
      });

      describe('renderFlattenedSourceMap()', () => {
        it('should convert the flattenedMappings into a raw source-map object', () => {
          const cSource = new SourceFile(_('/foo/src/c.js'), 'bcd123e', null, false, []);
          const bToCSourceMap: RawSourceMap = {
            mappings: encode([[[1, 0, 0, 0], [4, 0, 0, 3], [4, 0, 0, 6], [5, 0, 0, 7]]]),
            names: [],
            sources: ['c.js'],
            version: 3
          };
          const bSource =
              new SourceFile(_('/foo/src/b.js'), 'abcdef', bToCSourceMap, false, [cSource]);
          const aToBSourceMap: RawSourceMap = {
            mappings: encode([[[0, 0, 0, 0], [2, 0, 0, 3], [4, 0, 0, 2], [5, 0, 0, 5]]]),
            names: [],
            sources: ['b.js'],
            version: 3
          };
          const aSource =
              new SourceFile(_('/foo/src/a.js'), 'abdecf', aToBSourceMap, false, [bSource]);

          const aTocSourceMap = aSource.renderFlattenedSourceMap();
          expect(aTocSourceMap.version).toEqual(3);
          expect(aTocSourceMap.file).toEqual('a.js');
          expect(aTocSourceMap.names).toEqual([]);
          expect(aTocSourceMap.sourceRoot).toBeUndefined();
          expect(aTocSourceMap.sources).toEqual(['c.js']);
          expect(aTocSourceMap.sourcesContent).toEqual(['bcd123e']);
          expect(aTocSourceMap.mappings).toEqual(encode([
            [[1, 0, 0, 0], [2, 0, 0, 2], [3, 0, 0, 3], [3, 0, 0, 6], [4, 0, 0, 1], [5, 0, 0, 7]]
          ]));
        });
      });
    });

    describe('computeLineLengths()', () => {
      it('should compute the length of each line in the given string', () => {
        expect(computeLineLengths('')).toEqual([0]);
        expect(computeLineLengths('abc')).toEqual([3]);
        expect(computeLineLengths('\n')).toEqual([0, 0]);
        expect(computeLineLengths('\n\n')).toEqual([0, 0, 0]);
        expect(computeLineLengths('abc\n')).toEqual([3, 0]);
        expect(computeLineLengths('\nabc')).toEqual([0, 3]);
        expect(computeLineLengths('abc\ndefg')).toEqual([3, 4]);
        expect(computeLineLengths('abc\r\n')).toEqual([3, 0]);
        expect(computeLineLengths('abc\r\ndefg')).toEqual([3, 4]);
      });
    });
  });
});
