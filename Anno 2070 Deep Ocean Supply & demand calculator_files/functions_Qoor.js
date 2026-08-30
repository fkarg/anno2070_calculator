// JavaScript Document

//if (document.getElementById)   {      return document.getElementById(id);   }

function get_radio_value(name)
{
	for (var i=0; i < document.getElementsByName(name).length; i++)
	{
		if (document.getElementsByName(name)[i].checked)
		{
			return document.getElementsByName(name)[i].value;
		}
	}
}

function getElementsStartsWithId( id ) {
  var children = document.body.getElementsByTagName('input');
  var elements = [], child;
  for (var i = 0, length = children.length; i < length; i++) {
    child = children[i];
    if (child.id.substr(0, id.length) == id)
      elements.push(child);
  }
  return elements;
}

function edit_percentage(id,updown)
{
	var elements = getElementsStartsWithId(id+"_");
	for (var i=1; i < elements.length; i++)
	{
		elements[i].value = parseInt(elements[i].value)+updown;
	}
}


function calculate_workers()
{
	// ECO's section
	var total=document.workers.eco_h.value;
	var employee_and_up = Math.floor(total * 0.8);
	var engineer_and_up = Math.floor(employee_and_up * 0.6);
	
	if (document.workers.senate_eco.checked)
		var executive = Math.floor(engineer_and_up * 0.45);
	else
		var executive = Math.floor(engineer_and_up * 0.40);
	
	if (document.workers.space_eco.checked)
		var extra_workers = 1.12;
	else
		var extra_workers = 1;
	
	if (total != 0){
		switch(get_radio_value("eco")){
			case '1':
				document.workers.eco1.value = 8*total;
				document.workers.eco2.value = 0;
				document.workers.eco3.value = 0;
				document.workers.eco4.value = 0;
				break;
			case '2':
				document.workers.eco1.value = 8*(total - employee_and_up);
				document.workers.eco2.value = employee_and_up*Math.floor(extra_workers*15);
				document.workers.eco3.value = 0;
				document.workers.eco4.value = 0;
				break;
			case '3':
				document.workers.eco1.value = 8*(total - employee_and_up);
				document.workers.eco2.value = (employee_and_up - engineer_and_up)*Math.floor(extra_workers*15);
				document.workers.eco3.value = engineer_and_up*Math.floor(extra_workers*25);
				document.workers.eco4.value = 0;
				break;
			case '4':
				document.workers.eco1.value = 8*(total - employee_and_up);
				document.workers.eco2.value = (employee_and_up - engineer_and_up)*Math.floor(extra_workers*15);
				document.workers.eco3.value = (engineer_and_up - executive)*Math.floor(extra_workers*25);
				document.workers.eco4.value = executive*Math.floor(extra_workers*40);
				break;
			default:
				alert("Error found!");
		}
	}
	
	// Tycoon's section
	total=document.workers.tycoon_h.value;
	employee_and_up = Math.floor(total * 0.8);
	engineer_and_up = Math.floor(employee_and_up * 0.6);
	
	if (document.workers.senate_tycoon.checked)
		executive = Math.floor(engineer_and_up * 0.45);
	else
		executive = Math.floor(engineer_and_up * 0.40);
	
	if (document.workers.space_tycoon.checked)
		var extra_workers = 1.12;
	else
		var extra_workers = 1;
	
	if (total != 0){
		switch(get_radio_value("tycoon")){
			case '1':
				document.workers.tycoon1.value = 8*total;
				document.workers.tycoon2.value = 0;
				document.workers.tycoon3.value = 0;
				document.workers.tycoon4.value = 0;
				break;
			case '2':
				document.workers.tycoon1.value = 8*(total - employee_and_up);
				document.workers.tycoon2.value = employee_and_up*Math.floor(extra_workers*15);
				document.workers.tycoon3.value = 0;
				document.workers.tycoon4.value = 0;
				break;
			case '3':
				document.workers.tycoon1.value = 8*(total - employee_and_up);
				document.workers.tycoon2.value = (employee_and_up - engineer_and_up)*Math.floor(extra_workers*15);
				document.workers.tycoon3.value = engineer_and_up*Math.floor(extra_workers*25);
				document.workers.tycoon4.value = 0;
				break;
			case '4':
				document.workers.tycoon1.value = 8*(total - employee_and_up);
				document.workers.tycoon2.value = (employee_and_up - engineer_and_up)*Math.floor(extra_workers*15);
				document.workers.tycoon3.value = (engineer_and_up - executive)*Math.floor(extra_workers*25);
				document.workers.tycoon4.value = executive*Math.floor(extra_workers*40);
				break;
			default:
				alert("Error found!");
		}
	}
	
	// TECH's section
	total=document.workers.tech_h.value;
	//employee_and_up = Math.floor(total * 0.65);
	employee_and_up = Math.floor(total * 0.60);
	
	if (document.workers.senate_tech.checked)
		engineer = Math.floor(employee_and_up * 0.35);
	else
		engineer = Math.floor(employee_and_up * 0.3);;
	
	if (document.workers.space_tech.checked)
		var extra_workers = 1.12;
	else
		var extra_workers = 1;
	
	if (total != 0) {
		switch(get_radio_value("tech")){
			case '1':
				document.workers.tech1.value = 5*total;
				document.workers.tech2.value = 0;
				document.workers.tech3.value = 0;
				break;
			case '2':
				document.workers.tech1.value = 5*(total - employee_and_up);
				document.workers.tech2.value = employee_and_up*Math.floor(extra_workers*30);
				document.workers.tech3.value = 0;
				break;
			case '3':
				document.workers.tech1.value = 5*(total - employee_and_up);
				document.workers.tech2.value = (employee_and_up - engineer)*Math.floor(extra_workers*30);
				document.workers.tech3.value = engineer*Math.floor(extra_workers*50);
				break;
			default:
				alert("Error found!");
		}
	}	

}

	//var num = 5.56789;
	// var n=num.toFixed(2);
function calc_production(id,satisfy1,demand1,satisfy2,demand2,satisfy3,demand3,satisfy4,demand4,recycle) {
	
	var percent = document.getElementById(id).value/100;
	var result = 0;
	
	if (recycle) {
		demand2 = demand2 * 0.85;
		demand3 = demand3 * 0.85;
		demand4 = demand4 * 0.85;
	}
	
	if (demand1 > 0)
		result += (demand1/satisfy1)/percent;
	if (demand2 > 0)
		result += (demand2/satisfy2)/percent;
	if (demand3 > 0)
		result += (demand3/satisfy3)/percent;
	if (demand4 > 0)
		result += (demand4/satisfy4)/percent;
		
	if (document.getElementById("exact_calc").checked)
		result = Math.ceil(result);
	
	document.getElementById(id+"R").innerHTML = "x "+(Math.ceil(result*100)/100)+" @&nbsp;";
	return result;
	
}

function calc_production_material(id,num_factory,multiplier) {
	var percent = document.getElementById(id).value/100;
	var result = 0;
	
	result = num_factory * multiplier / percent;
	
	if (document.getElementById("exact_calc").checked)
		result = Math.ceil(result);
	
	document.getElementById(id+"R").innerHTML = "x "+(Math.ceil(result*100)/100)+" @&nbsp;";
	return result;
}


function calculate_productivity() {
	
	
	var lvl1 = document.getElementById("eco1").value;
	var lvl2 = document.getElementById("eco2").value;
	var lvl3 = document.getElementById("eco3").value;
	var lvl4 = document.getElementById("eco4").value;
	var num_factory, num_factory_lvl2;
	
	// ECO's section
	var recycle = document.getElementById("recycling").checked;
	
	calc_production("eco_fish",250,lvl1,364,lvl2,571,lvl3,800,lvl4,false);
	calc_production("eco_tea",375,lvl1,375,lvl2,500,lvl3,750,lvl4,false);
	num_factory = calc_production("eco_health_food",0,0,667,lvl2,857,lvl3,1000,lvl4,false);
		calc_production_material("eco_vegetables",num_factory,2);
		calc_production_material("eco_rice",num_factory,1);
	num_factory = calc_production("eco_comunicator",0,0,571,lvl2,800,lvl3,1250,lvl4,recycle);
		num_factory_lvl2 = calc_production_material("eco_chip",num_factory,1);
			calc_production_material("eco_copper",num_factory_lvl2,0.5);
			calc_production_material("eco_sand",num_factory_lvl2,1/3);
		calc_production_material("eco_elec_rec",num_factory,2/3);
	num_factory = calc_production("eco_biodrinks",0,0,0,0,833,lvl3,1136,lvl4,false);
		calc_production_material("eco_fruits",num_factory,2);
		calc_production_material("eco_milk",num_factory,1);
	num_factory = calc_production("eco_pasta",0,0,0,0,667,lvl3,909,lvl4,false);
		calc_production_material("eco_vegetables2",num_factory,1);
		num_factory_lvl2 = calc_production_material("eco_flour",num_factory,0.5);
			calc_production_material("eco_grain",num_factory_lvl2,3);
	num_factory = calc_production("eco_3dproyector",0,0,0,0,0,0,750,lvl4,recycle);
		calc_production_material("eco_diamonds",num_factory,50/89);
		num_factory_lvl2 = calc_production_material("eco_rare_earth",num_factory,100/89);
			calc_production_material("eco_manganese",num_factory_lvl2,0.5);
	num_factory = calc_production("eco_robot",0,0,0,0,0,0,(666+2/3),lvl4,recycle);
		num_factory_lvl2 = calc_production_material("eco_chip2",num_factory,0.5);
			calc_production_material("eco_copper2",num_factory_lvl2,0.5);
			calc_production_material("eco_sand2",num_factory_lvl2,1/3);
		calc_production_material("eco_elec_rec2",num_factory,1/3);
		num_factory_lvl2 = calc_production_material("eco_biopolymer",num_factory,1);
			calc_production_material("eco_algae",num_factory_lvl2,1);
			calc_production_material("eco_corn",num_factory_lvl2,2);
	
	// TYCOON's section
	lvl1 = document.getElementById("tycoon1").value;
	lvl2 = document.getElementById("tycoon2").value;
	lvl3 = document.getElementById("tycoon3").value;
	lvl4 = document.getElementById("tycoon4").value;
	
	calc_production("tycoon_fish",250,lvl1,364,lvl2,571,lvl3,800,lvl4,false);
	calc_production("tycoon_liquor",300,lvl1,333,lvl2,300,lvl3,750,lvl4,false);
	num_factory = calc_production("tycoon_convenience_food",0,0,577,lvl2,714,lvl3,857,lvl4,false);
		calc_production_material("tycoon_meat",num_factory,2);
		calc_production_material("tycoon_flavor",num_factory,1);
	num_factory = calc_production("tycoon_plastic",0,0,667,lvl2,1000,lvl3,1667,lvl4,false);
		num_factory_lvl2 = calc_production_material("tycoon_oil",num_factory,1);
			calc_production_material("tycoon_crude",num_factory_lvl2,1);
			calc_production_material("tycoon_oil_driller",num_factory_lvl2,3);
	num_factory = calc_production("tycoon_luxury_meal",0,0,0,0,833,lvl3,1111,lvl4,false);
		calc_production_material("tycoon_lobster",num_factory,0.5);
		calc_production_material("tycoon_truffle",num_factory,2);
	num_factory = calc_production("tycoon_campagne",0,0,0,0,1042,lvl3,1389,lvl4,false);
		calc_production_material("tycoon_grapes",num_factory,2);
		calc_production_material("tycoon_sugar",num_factory,1);
	num_factory = calc_production("tycoon_jewelery",0,0,0,0,0,0,665,lvl4,false);
		calc_production_material("tycoon_diamonds",num_factory,1);
		num_factory_lvl2 = calc_production_material("tycoon_gold",num_factory,1);
			calc_production_material("tycoon_gold_nuggets",num_factory_lvl2,1);
			calc_production_material("tycoon_gold_converter",num_factory_lvl2,0.89);
			calc_production_material("tycoon_coal",num_factory_lvl2,0.5);
			calc_production_material("tycoon_rotary_excavator",num_factory_lvl2,1);
	num_factory = calc_production("tycoon_pharmaceuticals",0,0,0,0,0,0,571,lvl4,false);
		num_factory_lvl2 = calc_production_material("tycoon_rare_earth",num_factory,1.5);
			calc_production_material("tycoon_manganese",num_factory_lvl2,0.5);
		num_factory_lvl2 = calc_production_material("tycoon_secret_ingredients",num_factory,1);
			calc_production_material("tycoon_omega_acids",num_factory_lvl2,3);
			calc_production_material("tycoon_algae",num_factory_lvl2,1);
	
	
	
	// TECH's section
	lvl1 = document.getElementById("tech1").value;
	lvl2 = document.getElementById("tech2").value;
	lvl3 = document.getElementById("tech3").value;
	
	calc_production("tech_fish",800,lvl1,800,lvl2,1600,lvl3,0,0,false);
	num_factory = calc_production("tech_functional_food",299,lvl1,444,lvl2,1250,lvl3,0,0,false);
		calc_production_material("tech_algae",num_factory,1);
	num_factory = calc_production("tech_functional_drinks",301,lvl1,735,lvl2,1250,lvl3,0,0,false);
		calc_production_material("tech_sugar",num_factory,1);
		calc_production_material("tech_caffeine",num_factory,1);
	num_factory = calc_production("tech_inmunity_drugs",0,0,500,lvl2,667,lvl3,0,0,false);
		calc_production_material("tech_enzymes",num_factory,1);
		calc_production_material("tech_coral",num_factory,0.5);
	num_factory = calc_production("tech_neuroimplants",0,0,667,lvl2,667,lvl3,0,0,false);
		calc_production_material("tech_sponges",num_factory,1);
		num_factory_lvl2 = calc_production_material("tech_chip",num_factory,0.5);
			calc_production_material("tech_copper",num_factory_lvl2,0.5);
			calc_production_material("tech_sand",num_factory_lvl2,1/3);
		calc_production_material("tech_elec_rec",num_factory,1/3);
	num_factory = calc_production("tech_lab_instruments",0,0,0,0,444,lvl3,0,0,false);
		calc_production_material("tech_platinum1",num_factory,1);
		num_factory_lvl2 = calc_production_material("tech_iron",num_factory,1);
			calc_production_material("tech_iron_ore",num_factory_lvl2,1);
			calc_production_material("tech_iron_converter",num_factory_lvl2,2/3);
			calc_production_material("tech_coal",num_factory_lvl2,0.5);
			calc_production_material("tech_rotary_excavator",num_factory_lvl2,1);
	num_factory = calc_production("tech_bionic_suits",0,0,0,0,1481,lvl3,0,0,false);
		num_factory_lvl2 = calc_production_material("tech_biopolymers",num_factory,1);
			calc_production_material("tech_algae2",num_factory_lvl2,1);
			calc_production_material("tech_corn",num_factory_lvl2,2);
		num_factory_lvl2 = calc_production_material("tech_exoeskeletons",num_factory,1);
			calc_production_material("tech_platinum2",num_factory_lvl2,1);
			num_factory_lvl2 = calc_production_material("tech_electrolite_cells",num_factory_lvl2,1);
				calc_production_material("tech_lithium",num_factory_lvl2,2);
				calc_production_material("tech_omega_acids",num_factory_lvl2,2);
	
	
}

function reset_productivity() {
	for (var i=0; i < document.getElementsByClassName("prod").length; i++)
	{
		document.getElementsByClassName("prod")[i].innerHTML = "x ?? @&nbsp;";
	}
}