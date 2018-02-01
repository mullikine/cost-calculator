import * as React from "react";
import { reduxForm, InjectedFormProps, Field, WrappedFieldProps, formValues, FormSection, FieldArray, formValueSelector, getFormValues, WrappedFieldArrayProps, submit } from 'redux-form';
import { FormGroup, ControlLabel, FormControl, Form, Col, Grid, Tabs, Tab, Button, Glyphicon, ProgressBar, Modal, ButtonGroup, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import * as DateTimePicker from 'react-widgets/lib/DateTimePicker'
import { connect } from 'react-redux';
import { formatCurrency, numberWithCommas, DATE_FORMAT } from '../utils';
import Schemes from '../schemes';
import * as moment from 'moment';





export const RateSelector = formValueSelector('cc');
export const AddItemSelector = formValueSelector('addItem');
export const AddDisbursementSelector = formValueSelector('addDisbursements');


export const findRate = (scheme: CC.Scheme, rateCode: string) =>  {
    return (scheme.rates.find((rate : CC.Rate) => rate.category === rateCode) || {rate : 0}).rate;
}

export const findDescription = (scheme: CC.Scheme, costCode: string) =>  {
    return scheme.costMap[costCode].label;
}

export const hasBand = (scheme: CC.Scheme, costCode: string) =>  {
    return !scheme.costMap[costCode].explaination;
}

export const findDays = (scheme: CC.Scheme, costCode: string, band: string, days?: number) =>  {
    const item = scheme.costMap[costCode] as CC.CostItem;
    if(item.explaination){
        return days;
    }
    return (item as any)[band];
}

export const calculateAmount = (scheme: CC.Scheme, costCode: string, rate: number, band: string, days?: number) => {
    days = findDays(scheme, costCode, band, days);
    return days * rate;
}


interface SchemedFieldProps {
    scheme : CC.Scheme
}

class SchemedField extends Field<SchemedFieldProps> {}

export const required = (value : any) => (value ? undefined : 'Required')


function FieldRow(Component: any) : any {

    return class Wrapped extends React.PureComponent<any> {
        getValidationState() {
            if(this.props.meta.touched){
                return this.props.meta.valid ? 'success' : 'error';
            }
            return null;
        }

        render(){
            const props = this.props;
            return <FormGroup validationState={this.getValidationState()}>
                <Col sm={3} className="text-right">
                    <ControlLabel>{ props.title }</ControlLabel>
                </Col>
                <Col sm={9}>
                     <Component {...props} />
                    <FormControl.Feedback />
                </Col>
            </FormGroup>
        }

    }
}

class RenderDateTimePicker extends React.PureComponent<WrappedFieldProps> {
    render() {
        const  { input: { onChange, value }} = this.props;
        return   <DateTimePicker
            onChange={onChange}
            format={DATE_FORMAT}
            time={false}
            value={!value ? null : new Date(value)}
          />
    }
}


class SelectField extends React.PureComponent<WrappedFieldProps> {
    render() {
        return <FormControl {...this.props.input} componentClass="select">
            { this.props.children }
        </FormControl>
    }
}

class TextField extends React.PureComponent<WrappedFieldProps> {
    render() {
        return <FormControl {...this.props.input} componentClass="input" />
    }
}

class TextAreaField extends React.PureComponent<WrappedFieldProps> {
    render() {
        return <FormControl {...this.props.input} componentClass="textarea" />
    }
}

class NumberField extends React.PureComponent<WrappedFieldProps> {
    render() {
        return <FormControl {...this.props.input} componentClass="input" type='number' step="0.05" />
    }
}

class IntegerField extends React.PureComponent<WrappedFieldProps> {
    render() {
        return <FormControl {...this.props.input} componentClass="input" type='number' step="1" />
    }
}

class DateField extends React.PureComponent<WrappedFieldProps> {
    render() {
        return <FormControl {...this.props} componentClass={RenderDateTimePicker}  />
    }
}


const RenderFileTypeSelector = (props: WrappedFieldProps) => {
        return <ToggleButtonGroup name="fileType" value={props.input.value} onChange={props.input.onChange} type="radio">
            <ToggleButton value="docx"><i className="fa fa-file-word-o"/> Word (.docx)</ToggleButton>
            <ToggleButton value="pdf"><i className="fa fa-file-pdf-o"/> PDF (.pdf)</ToggleButton>
            <ToggleButton value="odt"><i className="fa fa-file-text-o"/>  OpenDocument (.odt)</ToggleButton>
        </ToggleButtonGroup>
}

class FileTypeField extends React.PureComponent<WrappedFieldProps> {
    render() {
        return <FormControl {...this.props} componentClass={RenderFileTypeSelector}  />
    }
}

export const DateFieldFieldRow = FieldRow(DateField)
export const SelectFieldRow = FieldRow(SelectField);
export const TextFieldRow = FieldRow(TextField);
export const TextAreaFieldRow = FieldRow(TextAreaField);
export const NumberFieldRow = FieldRow(NumberField);
export const IntegerFieldRow = FieldRow(IntegerField);
export const FileTypeFieldRow = FieldRow(FileTypeField);


export class Rate extends React.PureComponent<{scheme: CC.Scheme}> {
    render() {
        return <Field  title={'Daily Rate'} name={'rateCode'} component={SelectFieldRow} validate={required}>
                { this.props.scheme && this.props.scheme.rates.map((rate: any) => {
                    return <option key={rate.category} value={rate.category}>{ `${rate.category} - ${formatCurrency(rate.rate)}` }</option>
                }) }
            </Field>
    }
}

export class Band extends React.PureComponent<{scheme: CC.Scheme}> {
    render() {
        return  <Field  title={'Band'} name={'band'} component={SelectFieldRow} validate={required}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </Field>
    }
}

export class CostSelect extends React.PureComponent<{scheme: CC.Scheme, onChange: (event : React.FormEvent<HTMLSelectElement>, value: string) => void }> {
    render() {
        return <Field title={'Cost'} name={'costCode'} component={SelectFieldRow} validate={required} onChange={this.props.onChange}>
                <option value="" disabled>Please Select...</option>
                { this.props.scheme && this.props.scheme.costs.map((cost: any, index: number) => {
                    return <optgroup key={index} label={cost.label}>
                        { cost.items.map((item: any, index: number) => {
                            return <option key={index} value={item.costCode}>{ `${item.costCode} - ${item.label}` }</option>
                        })}
                    </optgroup>
                }) }
            </Field>
    }
}

export class DisbursementsSelect extends React.PureComponent<{scheme: CC.Scheme, onChange: (event : React.FormEvent<HTMLSelectElement>, value: string) => void }> {
    render() {

        let path = [] as [string];
        const recurse = (acc: [any], item: any, index: number) => {
            path.push(item.code)
            const value = path.join('')
            acc.push(<option key={value} value={value} disabled={!item.amount}>{ `${item.code.padStart(8 * (path.length-1)).replace(/ /g, '\u00A0')} - ${item.label}` }</option>);
            acc = item.items ? item.items.reduce(recurse, acc) : acc;
            path.pop();
            return acc;
        }

        return <Field title={'Disbursement'} name={'code'} component={SelectFieldRow} validate={required}  onChange={this.props.onChange}>
                <option value="" disabled>Please Select...</option>
                <option value="custom">Custom Disbursement</option>
                { this.props.scheme && this.props.scheme.disbursements.map((cost: any, index: number) => {
                    return <optgroup key={index} label={cost.label}>
                        { cost.items.reduce(recurse, []) }

                    </optgroup>
                }) }
            </Field>
    }
}

interface AddItemProps{
    scheme: CC.Scheme,
    hasBands: boolean,
    cost: CC.CostItem
}

type AddItemFormProps = AddItemProps & InjectedFormProps;

export class AddItem extends React.PureComponent<AddItemFormProps> {
    constructor(props: AddItemFormProps) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event: React.FormEvent<HTMLSelectElement>, value: string) {
        const description = findDescription(this.props.scheme, value);
        this.props.change('description', description || '');

    }

    render() {
        const { error, handleSubmit, hasBands, cost } = this.props;
        return  <Form horizontal  onSubmit={handleSubmit}>
            <Field title="Date" name="date" component={DateFieldFieldRow} validate={required} />
            <Rate scheme={this.props.scheme} />
            <CostSelect scheme={this.props.scheme} onChange={this.handleChange}/>
            <Field title="Description" name="description"  component={TextAreaFieldRow} validate={required} />
            {hasBands && <Band scheme={this.props.scheme} />}
            {!hasBands && <FormGroup key="explaination">
                <Col sm={3} className="text-right">
                    <ControlLabel>Explaination</ControlLabel>
                </Col>
                <Col sm={7}><div className="form-text">
                    { this.props.cost.explaination }
                    </div>
                </Col>
            </FormGroup> }
            {!hasBands && <Field name="days" title="Days" component={NumberFieldRow} /> }
        </Form>
    }
}


const bandedCostMap = (state: CC.State, ownProps: {scheme: CC.Scheme}) => {
    const costCode = AddItemSelector(state, 'costCode');
    const cost = ownProps.scheme.costMap[costCode];
    const hasBands = !costCode || !cost.explaination;
    return {
        cost,
        hasBands
    }
};


const disbursementMap = (state: CC.State, ownProps: {scheme: CC.Scheme}) => {
    const { code, count, amount } = AddDisbursementSelector(state, 'code', 'count', 'amount');
    let disbursement = ownProps.scheme.disbursementMap[code];
    const custom = code === 'custom';
    if(disbursement){
        disbursement = disbursement[disbursement.length -1];
    }
    const noFee = disbursement && disbursement.amount === 'no fee';
    const userDefined = !disbursement && (!noFee || typeof disbursement.amount !== 'number');
    const calcAmount = noFee ? 0 : (userDefined ? amount : disbursement.amount);
    return {
        custom,
        count,
        amount: calcAmount,
        disbursement,
        noFee,
        userDefined
    }
};


export const AddItemForm = reduxForm<{scheme: CC.Scheme}>({
    form: 'addItem',
})(connect<{}, {}, {scheme: CC.Scheme}>(bandedCostMap)(AddItem)) as any;


interface AddDisbursementsProps {
    scheme: CC.Scheme, userDefined: boolean, noFee: boolean, disbursement: CC.Disbursement, count: number, amount: number, custom: boolean
}

type AddDisbursementFormProps = AddDisbursementsProps & InjectedFormProps;

export class AddDisbursements extends React.PureComponent<AddDisbursementFormProps> {
    constructor(props: AddDisbursementFormProps) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event: React.FormEvent<HTMLSelectElement>, value: string) {
        const disbursementList = this.props.scheme.disbursementMap[value];
        let description = ''
        if(disbursementList){
            description = disbursementList.map((d: CC.Disbursement) => d.label).join('\n');
        }
        this.props.change('description', description);

    }

    render() {
        const { error, handleSubmit, userDefined, noFee, disbursement, custom  } = this.props;
        const showTotal = !!this.props.count && !!this.props.amount;
        return  <Form horizontal  onSubmit={handleSubmit}>
            <Field title="Date" name="date" component={DateFieldFieldRow} validate={required} />
            <DisbursementsSelect scheme={this.props.scheme} onChange={this.handleChange}/>
            <Field title="Description" name="description"  component={TextAreaFieldRow} validate={required} />
            { userDefined && <Field title="Item Cost" name="amount" component={NumberFieldRow} validate={required} /> }
            <Field title="Count" name="count" component={IntegerFieldRow} validate={required} />
            <FormGroup key="explaination">
                <Col sm={3} className="text-right">
                    <ControlLabel>Total</ControlLabel>
                </Col>
                <Col sm={7}>
                <div className="form-text">
                { showTotal && `${numberWithCommas(this.props.count)} x ${formatCurrency(this.props.amount)} = ` }
                { showTotal && <strong>{ `${formatCurrency((this.props.count * this.props.amount) || 0)}`}</strong> }
                { !showTotal && '$0'}
                </div>
                </Col>
               </FormGroup>
        </Form>
    }
}

export const AddDisbursementsForm = reduxForm<{scheme: CC.Scheme}>({
    form: 'addDisbursements',
})(connect<{}, {}, {scheme: CC.Scheme}>(disbursementMap)(AddDisbursements)) as any;


interface SchemeNamedCourtCosts {
    scheme: string,
    itemsComponent: React.ComponentClass<any>,
    disbursementsComponent: React.ComponentClass<any>
}



export class UnSchemedCourtCosts extends React.PureComponent<SchemeNamedCourtCosts> {

    render() {
        return [
             <Rate key={'rate'} scheme={Schemes[this.props.scheme]} />,
             <Band key={'band'} scheme={Schemes[this.props.scheme]} />,
            <FieldArray key={'addItem'} name="costs" component={this.props.itemsComponent  as any} props={{scheme: Schemes[this.props.scheme]}} />,
            <FieldArray key={'addDisbursements'} name="disbursements" component={this.props.disbursementsComponent as any} props={{scheme: Schemes[this.props.scheme]}} />,
            <ConnectedDisplayTotal key={'total'}/>
         ];
    }
}
export const SchemedCourtCosts = connect<{scheme: string}, {}, {itemsComponent: React.ComponentClass<any>, disbursementsComponent: React.ComponentClass<any>}>(state => ({
    scheme: RateSelector(state, 'scheme')
}))(UnSchemedCourtCosts);




export function prepareValues(scheme: CC.Scheme, values: any, fileSettings: any){
    const rate = findRate(scheme, values.rateCode);
    const costTotal = values.costs.reduce((sum: number, costs: any) => sum + costs.amount, 0);
    const disbursementTotal = values.disbursements.reduce((sum: number, costs: any) => sum + costs.amount, 0)
    const result = {
        rateCode: values.rateCode,
        rate: formatCurrency(rate),
        costs: values.costs.map((c: any) => ({
            costCode: c.costCode,
            description: c.description,
            rateCode: c.rateCode,
            band: values.band,
            days: numberWithCommas(c.days),
            dateString: moment(c.date).format(DATE_FORMAT) ,
            amount: formatCurrency(c.amount)
        })),
        disbursements: values.disbursements.map((c: any) => ({
            code: c.code,
            description: c.description,
            itemCost: formatCurrency(c.itemAmount),
            count: numberWithCommas(c.count),
            dateString: moment(c.date).format(DATE_FORMAT) ,
            amount: formatCurrency(c.amount)
        })),
        costsTotal: formatCurrency(costTotal),
        disbursementsTotal: formatCurrency(disbursementTotal),
        total: formatCurrency(costTotal + disbursementTotal)
    };

    return {
        formName: 'court_costs',
        filename: fileSettings.filename,
        fileType: fileSettings.fileType,
        values: result,
        metadata: {},
        env: 'cc'
    }
}

export class DisplayTotal extends React.PureComponent<{lists: any}> {
    render() {
        const lists = this.props.lists;
        const costs = lists.costs.reduce((acc: number, item: CC.CostEntry) => {
            return item.amount + acc
        }, 0);
        const disbursements = lists.disbursements.reduce((acc: number, item: any) => {
            return item.amount + acc
        }, 0);
        const total = costs + disbursements;
        return <div className="text-right">
                <strong>Total: { `${formatCurrency(total)}` }</strong>
        </div>
    }
}

const ConnectedDisplayTotal = connect(state => ({
    lists: RateSelector(state, 'costs', 'disbursements')
}))(DisplayTotal as any);



class DownloadForm extends React.PureComponent<InjectedFormProps> {
    render() {
        return <Form horizontal onSubmit={this.props.handleSubmit}>
             <Field title="File Type" name="fileType"  component={FileTypeFieldRow} validate={required} />
             <Field title="Filename" name="filename"  component={TextFieldRow} validate={required} />
        </Form>
    }
}

export const ConnectedDownloadForm = reduxForm({form: 'download'})(DownloadForm);