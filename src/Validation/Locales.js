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

export {
    pt_br,
}
