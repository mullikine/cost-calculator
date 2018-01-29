import * as React from "react";
import { reduxForm, InjectedFormProps, Field, WrappedFieldProps, formValues, FormSection, FieldArray, formValueSelector, getFormValues, WrappedFieldArrayProps, submit } from 'redux-form';
import { FormGroup, ControlLabel, FormControl, Form, Col, Grid, Tabs, Tab, Button, Glyphicon, ProgressBar, Modal } from 'react-bootstrap';
import * as HighCourt from '../data/High Court.json';
import { connect } from 'react-redux';
import * as DateTimePicker from 'react-widgets/lib/DateTimePicker'
import * as moment from 'moment';

const DATE_FORMAT = "DD MMM YYYY";


interface SchemedFieldProps {
    scheme : CC.Scheme
}

class SchemedField extends Field<SchemedFieldProps> {}

const required = (value : any) => (value ? undefined : 'Required')


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
                <Col sm={7}>
                     <Component {...props} />
                    <FormControl.Feedback />
                </Col>
            </FormGroup>
        }

    }
}

export function numberWithCommas(x: number | string) : string {
    if(!x) {
        return '0';
    }
    const parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
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

const DateFieldFieldRow = FieldRow(DateField)
const SelectFieldRow = FieldRow(SelectField);
const TextFieldRow = FieldRow(TextField);
const TextAreaFieldRow = FieldRow(TextAreaField);
const NumberFieldRow = FieldRow(NumberField);
const IntegerFieldRow = FieldRow(IntegerField);

const RateSelector = formValueSelector('cc');
const AddItemSelector = formValueSelector('addItem');


interface SchemeNamedCourtCosts {
    scheme: string
}

export class Rate extends React.PureComponent<{scheme: CC.Scheme}> {
    render() {
        return <Field  title={'Daily Rate'} name={'rateCode'} component={SelectFieldRow} validate={required}>
                { this.props.scheme && this.props.scheme.rates.map((rate: any) => {
                    return <option key={rate.category} value={rate.category}>{ `${rate.category} - $${numberWithCommas(rate.rate)}` }</option>
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

export class CostSelect extends React.PureComponent<{scheme: CC.Scheme}> {
    render() {
        return <Field title={'Cost'} name={'costCode'} component={SelectFieldRow} validate={required}>
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

export class DisbursementsSelect extends React.PureComponent<{scheme: CC.Scheme}> {
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

        return <Field title={'Disbursement'} name={'code'} component={SelectFieldRow} validate={required}>
                <option value="" disabled>Please Select...</option>
                { this.props.scheme && this.props.scheme.disbursements.map((cost: any, index: number) => {
                    return <optgroup key={index} label={cost.label}>
                        { cost.items.reduce(recurse, []) }

                    </optgroup>
                }) }
            </Field>
    }
}



export class ItemTable extends React.PureComponent<any> {
    render() {
        return <div>
            <table className="table table-striped">
                <thead>
                    <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Rate</th>
                    <th>Band</th>
                    <th>Days</th>
                    <th>Amount</th>
                    <th></th>
                    </tr>
                </thead>
                <tbody>
                    { this.props.fields.getAll().map((item: any, index: number) => {
                        return <tr key={index} onClick={() => this.props.editItem(item, index)}>
                            <td>{ item.costCode }</td>
                            <td>{ item.description }</td>
                            <td>{ moment(item.date).format(DATE_FORMAT) }</td>
                            <td>{ `$${numberWithCommas(item.rate)}` }</td>
                            <td>{ item.band || '-' }</td>
                            <td>{ item.days }</td>
                            <td>{ `$${numberWithCommas(item.amount)}` }</td>
                            <td><Button bsSize='xs' onClick={(e) => this.props.remove(e, index)}><Glyphicon glyph="remove"/></Button> </td>
                        </tr>
                    }) }
                </tbody>
            </table>
        </div>
    }
}

export class DisbursementsTable extends React.PureComponent<any> {
    render() {
        return <div>
            <table className="table table-striped">
                <thead>
                    <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Item Amount</th>
                    <th>Count</th>
                    <th>Total Amount</th>
                    <th></th>
                    </tr>
                </thead>
                <tbody>
                    { this.props.fields.getAll().map((item: any, index: number) => {
                        return <tr key={index} onClick={() => this.props.editItem(item, index)}>
                            <td>{ item.code }</td>
                            <td>{ item.description }</td>
                            <td>{ moment(item.date).format(DATE_FORMAT) }</td>
                            <td>{ `$${numberWithCommas(item.itemAmount)}` }</td>
                            <td>{ `${numberWithCommas(item.count)}` }</td>
                            <td>{ `$${numberWithCommas(item.amount)}` }</td>
                            <td><Button bsSize='xs' onClick={(e) => this.props.remove(e, index)}><Glyphicon glyph="remove"/></Button> </td>
                        </tr>
                    }) }
                </tbody>
            </table>
        </div>
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


export class AddItem extends React.PureComponent<{scheme: CC.Scheme, hasBands: boolean, cost: CC.CostItem} & InjectedFormProps> {
    render() {
        const { error, handleSubmit, hasBands, cost } = this.props;
        return  <Form horizontal  onSubmit={handleSubmit}>
            <Field title="Date" name="date" component={DateFieldFieldRow} validate={required} />
            <Rate scheme={this.props.scheme} />
            <CostSelect scheme={this.props.scheme} />
            {hasBands && <Band scheme={this.props.scheme} />}
            {!hasBands && <FormGroup key="explaination">
                <Col sm={3} className="text-right">
                    <ControlLabel>Explaination</ControlLabel>
                </Col>
                <Col sm={7}>
                    { this.props.cost.explaination }
                </Col>
            </FormGroup> }
            {!hasBands && <Field name="days" title="Days" component={NumberFieldRow} /> }
        </Form>
    }
}

const findRate = (scheme: CC.Scheme, rateCode: string) =>  {
    return (scheme.rates.find((rate : CC.Rate) => rate.category === rateCode) || {rate : 0}).rate;
}

const findDescription = (scheme: CC.Scheme, costCode: string) =>  {
    return scheme.costMap[costCode].label;
}

const hasBand = (scheme: CC.Scheme, costCode: string) =>  {
    return !scheme.costMap[costCode].explaination;
}

const findDays = (scheme: CC.Scheme, costCode: string, band: string, days?: number) =>  {
    const item = scheme.costMap[costCode] as CC.CostItem;
    if(item.explaination){
        return days;
    }
    return (item as any)[band];
}

const calculateAmount = (scheme: CC.Scheme, costCode: string, rate: number, band: string, days?: number) => {
    days = findDays(scheme, costCode, band, days);
    return days * rate;
}

const AddItemForm = reduxForm<{scheme: CC.Scheme}>({
    form: 'addItem',
})(connect<{}, {}, {scheme: CC.Scheme}>(bandedCostMap)(AddItem)) as any;


export class AddDisbursements extends React.PureComponent<{scheme: CC.Scheme} & InjectedFormProps> {
    render() {
        const { error, handleSubmit } = this.props;
        return  <Form horizontal  onSubmit={handleSubmit}>
            <Field title="Date" name="date" component={DateFieldFieldRow} validate={required} />
            <DisbursementsSelect scheme={this.props.scheme} />
            <Field title="Number" name="count" component={IntegerFieldRow} validate={required} />
            {/* <Field title="Description" name="description" component={TextAreaFieldRow} validate={required} /> */ }
            {/* <Field title="Amount" name="amount" component={NumberFieldRow} validate={required} /> */ }
        </Form>
    }
}

const AddDisbursementsForm = reduxForm<{scheme: CC.Scheme}>({
    form: 'addDisbursements',
})(AddDisbursements) as any;

interface AddItemProps {
    scheme: CC.Scheme, submit: () => void,
    defaults: {rateCode: number, band:string}
}


//export class AddItemModal extends React.PureComponent<AddItemProps & WrappedFieldArrayProps<CC.CostEntry>, {showAddItem: boolean, values?: CC.CostEntry, editIndex?: number}> {


export class TableAndModal extends React.PureComponent<any, {showAddItem: boolean, values?: CC.CostEntry, editIndex?: number}> {
    constructor(props: any) {
        super(props);
        this.handleShow = this.handleShow.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.editItem = this.editItem.bind(this);
        this.remove = this.remove.bind(this);
        this.submit = this.submit.bind(this);
        this.state = { showAddItem: false };
    }

    handleSubmit(values : any) {
        if(this.state.values){
            this.props.fields.remove(this.state.editIndex);
            // ugly, ugly hack
            setTimeout(() => this.props.fields.insert(this.state.editIndex, this.props.prepareValues(this.props.scheme, values)), 0)
        }
        else{
            this.props.fields.push(this.props.prepareValues(this.props.scheme, values));
        }
        this.handleClose();
    }

    editItem(values : any, editIndex: number) {
        this.setState({ showAddItem: true, values, editIndex });
    }

    handleClose() {
        this.setState({ showAddItem: false, values: null });
    }

    handleShow() {
        this.setState({ showAddItem: true, values: null });
    }

    submit() {
        this.props.submit();
    }

    remove(e: React.MouseEvent<HTMLElement>, index: number) {
        e.stopPropagation();
        this.props.fields.remove(index);
    }

    render() {
        const subtotal = this.props.fields.getAll().reduce((acc: number, item: CC.CostEntry) => {
            return item.amount + acc
        }, 0)
        const TableComponent = this.props.tableComponent;
        const FormComponent = this.props.formComponent;
        return [
            <h3 key={-2}>{ this.props.title }</h3>,
            <TableComponent key={-1} {...this.props} editItem={this.editItem} remove={this.remove}/>,
            <div  key={0} className="">
             <Button bsStyle="primary"  onClick={this.handleShow}>
               {this.props.addText}
                </Button>
                <div className="pull-right">
                <strong>Subtotal: { `$${numberWithCommas(subtotal)}` }</strong>
                </div>
               </div>,
            <Modal key={1} show={this.state.showAddItem} onHide={this.handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>{ this.state.values ? 'Edit Item' : 'Add Item' }</Modal.Title>
            </Modal.Header>
            <Modal.Body>
            <FormComponent scheme={this.props.scheme} onSubmit={this.handleSubmit} initialValues={{date: new Date(), ...(this.state.values || this.props.defaults)}}/>
           </Modal.Body>
            <Modal.Footer>
                <Button onClick={this.handleClose}>Close</Button>
                <Button bsStyle="primary" onClick={this.submit}>{ this.state.values ? 'Edit Item' : 'Add Item' }</Button>
            </Modal.Footer>
           </Modal>]
    }
}

const CostsModalAndTable = (props: any) => {
    return <TableAndModal
        {...props}
        title='Costs'
        addText='Add Cost Entry'
        tableComponent={ItemTable}
        formComponent={AddItemForm}
        prepareValues={(scheme: CC.Scheme, values : any) => {
            const rate = findRate(scheme, values.rateCode);
            const description = findDescription(scheme, values.costCode);
            return {
                costCode: values.costCode,
                description,
                band: hasBand(scheme, values.costCode) ? values.band : null,
                rate,
                date: values.date,
                rateCode: values.rateCode,
                days: findDays(scheme, values.costCode, values.band, values.days),
                amount:  calculateAmount(scheme, values.costCode, rate, values.band, values.days)
            };
        }}
    />
}

const DisbursementsModalAndTable = (props: any) => {
    return <TableAndModal
        {...props}
        title='Disbursements'
        addText='Add Disbursement'
        tableComponent={DisbursementsTable}
        formComponent={AddDisbursementsForm}
        prepareValues={(scheme: CC.Scheme, values : any) => {
            const disbursementList = scheme.disbursementMap[values.code];
            const disbursement = disbursementList[disbursementList.length - 1];
            return {
                code: values.code,
                description: disbursement.label,
                itemAmount: disbursement.amount,
                amount: values.count * disbursement.amount,
                count: values.count,
                date: values.date
            };
        }}
    />
}

const ConnectedCostsModalAndTable = connect((state) => ({
    defaults: RateSelector(state, 'rateCode', 'band'),
}), {submit: () => submit('addItem')})(CostsModalAndTable);

const ConnectedDisbursementsModalAndTable = connect((state) => ({
    defaults: {count: 1},
}), {submit: () => submit('addDisbursements')})(DisbursementsModalAndTable);


export class DisplayTotal extends React.PureComponent<{lists: any}> {
    render() {
        const lists = this.props.lists;
        const items = lists.items.reduce((acc: number, item: CC.CostEntry) => {
            return item.amount + acc
        }, 0);
        const disbursements = lists.disbursements.reduce((acc: number, item: CC.CostEntry) => {
            return item.amount + acc
        }, 0);
        const total = items + disbursements;
        return <div className="text-right">
                <strong>Total: { `$${numberWithCommas(total)}` }</strong>
        </div>
    }
}

const ConnectedDisplayTotal = connect(state => ({
    lists: RateSelector(state, 'items', 'disbursements')
}))(DisplayTotal as any);



export class UnSchemedCourtCosts extends React.PureComponent<SchemeNamedCourtCosts> {

    render() {
        return [

             <Rate key={'rate'} scheme={Schemes[this.props.scheme]} />,
             <Band key={'band'} scheme={Schemes[this.props.scheme]} />,
            <FieldArray key={'addItem'} name="items" component={ConnectedCostsModalAndTable  as any} props={{scheme: Schemes[this.props.scheme]}} />,
            <FieldArray key={'addDisbursements'} name="disbursements" component={ConnectedDisbursementsModalAndTable  as any} props={{scheme: Schemes[this.props.scheme]}} />,
            <ConnectedDisplayTotal key={'total'}/>
         ];
    }
}

const SchemedCourtCosts = connect(state => ({
    scheme: RateSelector(state, 'scheme')
}))(UnSchemedCourtCosts as any);


export class CourtCostsForm extends React.PureComponent<{}> {
    render() {
        return <Form horizontal>
            <Field title={'Scheme'} name={'scheme'} component={SelectFieldRow}>
                { Object.keys(Schemes).map((scheme: string) => {
                    return <option key={scheme} value={scheme}>{ scheme }</option>
                }) }
            </Field>
            <SchemedCourtCosts />

        </Form>
    }
}

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


export class CourtCosts extends React.PureComponent<{}> {
    render() {
        return <div className="container">
        <h1 className="text-center">Court Costs Prototype</h1>
            <CourtCostsForm />
        </div>
    }
}




export default reduxForm<{}>({
    form: 'cc',
    initialValues: {
        scheme: 'High Court',
        rateCode: '1',
        band: 'A',
        items: [],
        disbursements: []
    }
})(CourtCosts as any);