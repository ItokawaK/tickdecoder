var CLI;

async function loadminimap2() {
  $('#loading').css({'display': 'block'});
  CLI = await new Aioli("minimap2/2.22");
  $('#loading').css({'display': 'none'});
}

var result;
var refseq;
var acc2species = {};

async function loadRef() {
  $('#loading').css({'display': 'block'});
  let req = new XMLHttpRequest();
  req.open('GET', './ref.fasta', true)
  req.onload = async function() {
    refseq = parseFASTA(req.responseText);
    let fasta_str = '';
    refseq.forEach((item, i) => {
      let a = item.id.split('_');
      let species = a.slice(0, -1).join(' ');
      let acc = a.slice(-1);
      acc2species[acc] = species;
      refseq[i].id = acc;
      fasta_str += refseq[i].outFastaStr()
    });
    // console.log(fasta_str);
    let file = new File([fasta_str], 'ref.fasta', {type: 'text/plain'});
    await CLI.mount(file);
  }

  req.send(null);
  $('#loading').css({'display': 'none'});
}

async function alignment(event) {
  $('#loading').css({'display': 'block'});
   let files = await event.target.files;
   let file = files[0];
   var blob = file.slice(0, file.size, 'text/plain');
   let newFile = new File([blob], 'query.fasta', {type: 'text/plain'});
   let path = await CLI.mount(newFile);
   result = await CLI.exec(`minimap2 -c -p0.6 -N20 ref.fasta query.fasta`);

   parse_paf(result);
   $('#loading').css({'display': 'none'})
}

async function alignment2() {
   $('#loading').css({'display': 'block'});
   var blob = $('#manual_input').val();
   let newFile = new File([blob], 'query.fasta', {type: 'text/plain'});
   let path = await CLI.mount(newFile);
   result = await CLI.exec(`minimap2 -c -p0.6 -N20 ref.fasta query.fasta`);

   parse_paf(result);
   $('#loading').css({'display': 'none'})
}

function parse_paf(pafStr) {
  let lines = pafStr.split('\n');
  let pafs = [];
  let queryDict = {};
  for(let i=0; i<lines.length; i++){
    let fields = lines[i].split('\t');
    if(fields.length > 6){
      let paf = new PAF(fields);
      paf.species = acc2species[paf.subject];
      if (!(paf.query in queryDict)) {
        queryDict[paf.query] = new Query(paf.query);
      }
      queryDict[paf.query].add_hit(paf);
      pafs.push(paf)
    }
  }
  let queries = Object.values(queryDict);
  queries.forEach((el) => {el.selectHits()});
  let top_pafs = select_top_hit(pafs);
  let tabledata = [];

  queries.forEach( (el) => {
    tabledata = tabledata.concat(el.out_tble_rows())
  })

  console.log(tabledata);

  function format(cell, formatterParams) {
    let value = cell.getValue();
    if (value) {
      return value
    }
  }

  var table = new Tabulator("#out-table", {
      height:"400px",
      data:tabledata,           //assign data to table
      layout:"fitColumns",      //fit columns to width of table
      // renderHorizontal:"virtual",
      responsiveLayout:"hide",  //hide columns that dont fit on the table
      columnHeaderVertAlign:"bottom",
      columns: [
        {title:"Query", field:"Query", width:150,
                 frozen:true, formatter:format, headerSort:false},
        {title:"Possible Species", field:"Species", width:300, formatter:format, headerSort:false},
        {title:"Score", field:"Score", width:100, formatter:format, headerSort:false},
        {title:"Homology", field:"Homology", width:100,formatter:format, headerSort:false},
        {title:"Quality", field:"Quality", width:75,formatter:format, headerSort:false}
      ]
  });
}

await loadminimap2();
loadRef();
var a = document.getElementById("manual_input").addEventListener("change", alignment2);
document.getElementById("myfile").addEventListener("change", alignment, false);

$('#putExample').click(function (){
  $('#manual_input').val(sampledata);
  alignment2()
})
