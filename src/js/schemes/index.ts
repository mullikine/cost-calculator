import * as HighCourt from '../data/High Court.json';

const massageScheme = (scheme: any) => {
    scheme.costMap = scheme.costs.reduce((acc: CC.CostMap, cost: CC.Cost) => {
        cost.items.map((costItem: CC.CostItem) => {
            acc[costItem.costCode] = costItem;
        })
        return acc;
    }, {});


    let parts = [] as [CC.Disbursement];
    const recurse = (acc: any, item: any, index: number) => {
        parts.push(item)
        const value = parts.map(p => p.code).join('')
        acc[value] = [...parts];
        if(item.items){
            item.items.reduce(recurse, acc)
        }
        parts.pop();
        return acc;
    }
    scheme.disbursementMap = scheme.disbursements.reduce(recurse, {});
    return scheme as CC.Scheme;
}

const Schemes = {
    'High Court': massageScheme(HighCourt)
} as CC.Schemes;

export default  Schemes;