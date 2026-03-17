
import { convertBetweenModels } from './src/js/services/model-converter.js';
import { A1_SPEC } from './src/js/models/specs/a1.js';
import { ZXL_SPEC } from './src/js/models/specs/zxl.js';
import { ZX2SM_SPEC } from './src/js/models/specs/zx2sm.js';

function testIconMapping() {
  console.log('--- Testing A1 to ZX-L Icon Mapping ---');
  const a1Data = [
    { name: 'User1', icon1: '1', icon2: '2', phone1: '0311111111', phone2: '0322222222' },
    { name: 'User9', icon1: '9', icon2: '1', phone1: '0399999999', phone2: '0311111111' },
    { name: 'UserExt', icon1: '10', icon2: '0', phone1: '0300000000', phone2: '0300000001' }
  ];

  const result = convertBetweenModels(a1Data, A1_SPEC, ZXL_SPEC);
  
  result.data.forEach((row, i) => {
    console.log(`Row ${i} (${a1Data[i].name}):`);
    console.log(`  Source Icons: ${a1Data[i].icon1}, ${a1Data[i].icon2}`);
    console.log(`  Target Icons: ${row.icon1}, ${row.icon2}`);
  });

  /* 期待値検証 */
  const success = 
    result.data[0].icon1 === '16' && result.data[0].icon2 === '17' &&
    result.data[1].icon1 === '23' && result.data[1].icon2 === '16';
  
  console.log(success ? '✅ Success: Mapping correct' : '❌ Failure: Mapping incorrect');

  console.log('\n--- Testing ZX2SM to ZX-L Icon Mapping ---');
  const zxData = [
    { name: 'UserZX', icon1: '8', phone1: '0388888888' }
  ];
  const resultZX = convertBetweenModels(zxData, ZX2SM_SPEC, ZXL_SPEC);
  console.log(`Source Icon: ${zxData[0].icon1} -> Target Icon: ${resultZX.data[0].icon1}`);
  if (resultZX.data[0].icon1 === '52') {
    console.log('✅ Success: ZX2SM 8 mapped to 52');
  } else {
    console.log('❌ Failure');
  }
}

testIconMapping();
