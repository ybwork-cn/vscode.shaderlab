
const replace = (str: string, regex: RegExp, asyncFn: (v: string, ...others: string[]) => string) => {
    return str.replace(regex, asyncFn);
}

const $ = { replace };

export default $;
