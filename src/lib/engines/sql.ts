/** [Own] SQL formatter: uppercase keywords, clauses on new lines, AND/OR indented. Pure. */
export function fmtSQL(s: string): string {
  let o = s.replace(/\s+/g, " ").trim();
  [
    "left join",
    "right join",
    "inner join",
    "outer join",
    "group by",
    "order by",
    "insert into",
    "delete from",
    "select",
    "from",
    "where",
    "and",
    "or",
    "having",
    "limit",
    "offset",
    "join",
    "on",
    "values",
    "update",
    "set",
    "with",
    "as",
    "union",
    "case",
    "when",
    "then",
    "else",
    "end",
    "distinct",
    "in",
    "is",
    "not",
    "null",
    "like",
    "between",
    "desc",
    "asc",
    "count",
    "sum",
    "avg",
    "min",
    "max",
  ].forEach((k) => {
    o = o.replace(new RegExp("\\b" + k.replace(" ", "\\s+") + "\\b", "gi"), k.toUpperCase());
  });
  return o
    .replace(
      /\s*\b(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|UNION|VALUES|SET)\b/g,
      "\n$1",
    )
    .replace(/\s+\b(AND|OR)\b/g, "\n  $1")
    .replace(/^SELECT\s+/, "SELECT\n  ")
    .replace(/,\s*(?![^()]*\))/g, ",\n  ");
}
