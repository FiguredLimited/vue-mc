// TODO
//
// Document 'registerCollection' better
// Document that the attribute name is sent to the rule and added to the context
// Document `register`
// Proof / read through everything
// Add to Figured
// Test everything, create MR
// Write blog post draft
// When ready, passing etc, launch.

const pt_br = {
    locale: 'pt-br',
    messages: {
        after: 'Deve ser uma data depois de ${date}',
        alpha: 'Deve conter somente letras',
        alphanumeric: 'Deve conter somente letras e números',
        array: 'Deve ser um array',
        ascii: 'Deve ser ASCII',
        base64: 'Deve ser um Base64 válido',
        before: 'Deve ser uma data antes de ${date}',
        between: 'Deve estar entre ${min} e ${max}',
        between_inclusive: 'Deve estar entre ${min} e ${max}, inclusive',
        boolean: 'Deve ser verdadeiro ou falso',
        creditcard: 'Deve ser um número de cartão de crédito válido',
        date: 'Deve ser uma data válida',
        dateformat: 'Deve usar o formato "${format}"',
        defined: 'Campo obrigatório',
        email: 'Deve ser um endereço de email válido',
        empty: 'Deve ser vazio',
        equals: 'Deve ser igual a ${other}',
        gt: 'Deve ser maior que ${min}',
        gte: 'Deve ser maior ou igual a ${min}',
        integer: 'Deve ser um inteiro',
        ip: 'Deve ser um endereço de IP válido',
        isblank: 'Deve estar em branco',
        isnil: 'Deve ser null ou undefined',
        isnull: 'Deve ser null',
        iso8601: 'Deve ser uma data ISO8601 válida',
        json: 'Deve ser um JSON válido',
        length: 'Deve ter o tamanho de pelo menos ${min}',
        length_between: 'Deve ter o tamanho entre ${min} e ${max}',
        lt: 'Deve ser menor que ${max}',
        lte: 'Deve ser menor ou igual a ${max}',
        match: 'Deve ter o formato "${pattern}"',
        negative: 'Deve ser um número negativo',
        not: 'Não pode ser ${value}',
        number: 'Deve ser um número',
        numeric: 'Deve ser numérico',
        object: 'Deve ser um object',
        positive: 'Deve ser um número positivo',
        required: 'Campo obrigatório',
        same: 'Deve ser igual a "${other}"',
        string: 'Deve ser uma string',
        url: 'Deve ser uma URL válida',
        uuid: 'Deve ser um UUID válido',
    }
}

const es_ar = {
    locale: 'es-ar',
    messages: {
        after: 'El campo debe ser una fecha después de ${date}',
        alpha: 'El campo sólo puede contener letras.',
        alphanumeric: 'El campo sólo puede contener letras y números.',
        array: 'El campo debe ser un arreglo.',
        ascii: 'El campo debe ser un código de la tabla ASCII.',
        base64: 'El campo debe ser un Base64 válido.',
        before: 'El campo debe ser una fecha antes de ${date}.',
        between: 'El campo debe estar entre ${min} y ${max}.',
        between_inclusive: 'El campo debe estar entre ${min} y ${max}, inclusive.',
        boolean: 'El campo debe ser verdadero o falso.',
        creditcard: 'El campo debe ser un número de tarjeta de crédito válido',
        date: 'El campo ${date} no es una fecha válida.',
        dateformat: 'El campo no corresponde con el formato "${format}".',
        defined: 'El campo debe estar definido.',
        email: 'El formato del Email no es válido.',
        empty: 'El campo debe estar vacïo.',
        equals: 'El campo debe ser igual a ${other}.',
        gt: 'El campo debe ser mayor a ${min}.',
        gte: 'El campo debe ser mayor o igual a ${min}.',
        integer: 'El campo debe ser un entero.',
        ip: 'El campo debe ser una dirección IP válida.',
        isblank: 'El campo debe estar en blanco.',
        isnil: 'El campo debe ser nulo o no definido.',
        isnull: 'El campo debe ser nulo.',
        iso8601: 'El campo debe ser una fecha ISO8601 válida.',
        json: 'El campo debe ser debe ser una cadena JSON válida.',
        length: 'El campo debe tener al menos ${min}.',
        length_between: 'El campo debe tener un tamaño entre ${min} y ${max}.',
        lt: 'El campo debe ser menor que ${max}.',
        lte: 'El campo debe ser menor o igual a ${max}.',
        match: 'El campo debe coincidir con el formato "${pattern}".',
        negative: 'El campo debe ser un número negativo.',
        not: 'El campo no puede ser ${value}',
        number: 'El campo debe ser un número.',
        numeric: 'El campo debe ser numérico',
        object: 'El campo debe ser un objeto.',
        positive: 'El campo debe ser un número positivo.',
        required: 'El campo es obligatorio.',
        same: 'El campo debe ser igual a "${other}".',
        string: 'El campo debe ser una cadena de texto.',
        url: 'El campo debe ser una URL válida.',
        uuid: 'El campo debe ser un UUID válido.',
    }
}

export {
    pt_br,
    es_ar
}
