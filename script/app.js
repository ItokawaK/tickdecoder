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
  console.log(queries);
  let top_pafs = select_top_hit(pafs);
  let tabledata = [];

  queries.forEach( (el) => {
    tabledata.push(el.out_tble_row())
  })

  function format(cell, formatterParams) {
    let value = cell.getValue();
    if (value) {
      return value
    }
  }

  var table = new Tabulator("#out-table", {
      height:"600px",
      data:tabledata,           //assign data to table
      layout:"fitColumns",      //fit columns to width of table
      responsiveLayout:"hide",  //hide columns that dont fit on the table

      columnHeaderVertAlign:"bottom",
      columns: [
        {title:"Query", field:"Query", width:150, frozen:true},
        {
          title:"Best Hit",
          columns:[
            {title:"Species", field:"Species_1", width:200, formatter:format},
            {title:"Score", field:"Score_1", width:50, formatter:format},
            {title:"Homology", field:"Homology_1", formatter:format}
          ]
        },
        {
          title:"2nd Hit",
          columns:[
            {title:"Species", field:"Species_2", width:200, formatter:format},
            {title:"Score", field:"Score_2", width:50, formatter:format},
            {title:"Homology", field:"Homology_2", formatter:format}
          ]
        },
        {
          title:"3rd Hit",
          columns:[
            {title:"Species", field:"Species_3", width:200, formatter:format},
            {title:"Score", field:"Score_3", width:50, formatter:format},
            {title:"Homology", field:"Homology_3", formatter:format}
          ]
        }
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
