/*
    - note the 'guard clause' <tr>{data[0]... }</tr> meant to protect against empty data
 */
import React from 'react';

const Datatable = ({ data }) => {
    const columns = data[0] && Object.keys(data[0]);
    return (
        <table cellPadding={0} cellSpacing={0}>
            <thead>
                <tr>{data[0] && columns.map((heading, i) =><th key={`heading-${i+1}`}>
                        {heading}</th>)}</tr>
            </thead>
            <tbody>
                {data.map((row, i) => <tr key={`row-${i+1}`}>{
                    columns.map((col, i) => <td key={`col-${i+1}`}>{row[col]}</td>)
                }</tr>)}
            </tbody>
        </table>
    )
}

export default Datatable;
