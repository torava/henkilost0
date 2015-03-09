$(function() {
	var id_num_hashes = [0,1,2,3,4,5,6,7,8,9,'A','B','C','D','E','F','H','J','K','L','M','N','P','R','S','T','U','V','W','X','Y'];
	function leadingzeros(number, length) {
		return ('0'.repeat(length)+number.toString()).slice(-length);
	}
	function get_random_person() {
		var firstnames = ("Juhani,Johannes,Olavi,Antero,Tapani,Kalevi,Tapio,Matti,Mikael,Ilmari,Maria,Helena,Johanna,Anneli,Kaarina,Marjatta,Anna,Liisa,Annikki,Hannele,"+
						  "Matias,Ville,Oskari,Kristian,Ville,Teemu,Aleksi,Emilia,Sofia,Katariina,Karoliina,Elina,Kristiina,Eveliina,Susanna").split(","),
			surnames = "Korhonen,Virtanen,Mäkinen,Nieminen,Mäkelä,Hämäläinen,Laine,Heikkinen,Koskinen,Järvinen,Teekkari,Tapio".split(","),
			startdate = new Date(1950,1,1),
			enddate = new Date(2010,1,1),
			birth_date = new Date(startdate.getTime()+Math.random()*(enddate.getTime()-startdate.getTime())),
			birth_year = birth_date.getFullYear(),
			birthday = birth_year+'-'+leadingzeros(birth_date.getMonth()+1, 2)+'-'+leadingzeros(birth_date.getDate(), 2),
			id_num = get_part_of_id_num_from_birth_date(birth_date),
			first_name = firstnames[Math.floor(Math.random()*firstnames.length)],
			surname = surnames[Math.floor(Math.random()*surnames.length)],
			email = ((Math.random() < 0.5 ?
					(first_name+'.'+surname).toLowerCase() :
					first_name.toLowerCase()+birth_year))
					.replace(/ä/g, 'a').replace(/ö/g, 'o')
					+'@suomi24.fi';

		id_num+= leadingzeros(Math.floor(2+Math.random()*198), 3);
		id_num+= id_num_hashes[parseInt(id_num.substring(0,6)+id_num.substring(7,10)) % 31];

		return [first_name, surname, email, id_num, birthday];
	}
	function validate_id_num(value) {
		// ppkkvvyzzzq
		// 01234567890

		// check if value is correct length
		if (value.length != 11) {
			//console.log(value.length+' is wrong length');
			return false;
		}
		// second we test value with basic regular expression
		var rg = /^[0-9]{6}[-|+|A][0-9]{3}(.*)$/;
		if (!rg.test(value)) {
			//console.log('did not match with regular expression');
			return false;
		}

		var birth = value.substring(0,6),
			indiv = value.substring(7,10),
			hash = value.substring(10,11);

		var birth_date = get_birth_date_from_id_num(value);

		if (!Date.parse(birth_date)) {
			//console.log(birth_date+' is invalid');
			return false;
		}
		// hash index comes from remainder taken from sum of birth date and individualization
		var hi = parseInt(birth+indiv) % 31;
		// check if hash is correct
		if (id_num_hashes[hi].toString() !== hash) {
			//console.log(birth+indiv+' and 31 remainder is index '+hi+' which is referring to '+id_num_hashes[hi]+' which doesn\'t match');
			return false;
		}
		return value;
	}
	function format_date(value) {
		var timestamp = Date.parse(value);
		if (!isNaN(timestamp)) {
			var date = new Date(timestamp);
			return leadingzeros(date.getDate(),2)+'.'+leadingzeros(date.getMonth()+1,2)+'.'+date.getFullYear();
		}
		return false;
	}
	function validate_birth_date(value) {
		var timestamp = Date.parse(value);
		if (!isNaN(timestamp)) {
			var date = new Date(timestamp);
			return date.getFullYear()+'-'+leadingzeros(date.getMonth()+1,2)+'-'+leadingzeros(date.getDate(),2);
		}
		return false;
	}
	function get_birth_date_from_id_num(value) {
		var year = parseInt(value.substring(4,6)),
			month = value.substring(2,4),
			day = value.substring(0,2),
			century = value.substring(6,7),
			indiv = value.substring(7,10),
			hash = value.substring(10,11);

		if (century == '+') year+=1800;
		else if (century == '-') year+= 1900;
		else if (century == 'A') year+= 2000;

		year = year.toString();

		var date = year+'-'+month+'-'+day;
		return isNaN(Date.parse(date)) ? false : date;
	}
	function get_part_of_id_num_from_birth_date(birth_date) {
		var birth_year = birth_date.getFullYear().toString();
		id_num = leadingzeros(birth_date.getDate(), 2)+
				 leadingzeros(birth_date.getMonth()+1, 2)+
				 birth_year.slice(-2);

		if (birth_year-2000 > 0) id_num+= 'A';
		else if (birth_year-1900 > 0) id_num+= '-';
		else id_num+= '+';

		return id_num;
	}
	var data = [];
	for (var i = 0; i < 100; i++) {
		data.push(get_random_person());
	}
	$('.editable-table').editabletable({
		confirm_delete_msg: function(row) {
			var columns = row.children();
			return "Haluatko varmasti poistaa henkilön "+columns.eq(0).text()+" "+columns.eq(1).text()+" tiedot?"
		},
		validate: function(e) {
			var inputs = $(e.originalEvent.target).parents('tr').find('input');
			inputs[3].value && inputs.eq(3).attr('validationMessage', 'Antamasi henkilötunnus on virheellinen.')[0].setCustomValidity('');
			// if birth date and identification number does not match raise error on corresponding cell
			if (inputs[3].value && inputs[4].value && inputs[4].value !== get_birth_date_from_id_num(inputs[3].value)) {
				inputs.eq(4).attr('validationMessage', 'Antamasi henkilötunnus ja syntymäaika eivät täsmää.')[0].setCustomValidity(true);
			}
			else {
				inputs[3].setCustomValidity('');
			}
		},
		change: function(e) {
			var that = $(this).data('teemuEditabletable'),
				cell = $(e.originalEvent.target).parents('td'),
				columns = cell.parent().children('td'),
				value = e.originalEvent.target.value,
				id = that.structure[cell.index()].id;
			// 0 = first_name, 1 = surname, 2 = email, 3 = id_num, 4 = birth_date
			if (id == 'id_num' && !columns.eq(4).find('input').val()) {
				that.setValue(columns.eq(4), get_birth_date_from_id_num(value), true);
			}
			else if (id == 'birth_date' && !columns.eq(3).find('input').val()) {
				that.setValue(columns.eq(3), get_part_of_id_num_from_birth_date(new Date(Date.parse(value))), true);
			}
		}
	})
	.editabletable("importFromObject", {
		structure: [
			{
				id: "first_name",
				title: "Etunimi",
			},
			{
				id: "surname",
				title: "Sukunimi",
			},
			{
				id: "email",
				title: "Sähköposti",
				type: "email",
			},
			{
				id: "id_num",
				title: "Henkilötunnus",
				validation: validate_id_num
			},
			{
				id: "birth_date",
				title: "Syntymäaika",
				type: "date",
				validation: validate_birth_date,
				format: format_date
			}
		],
		data: data
	})
	.on('change', 'tbody > td', function() {

	});
});