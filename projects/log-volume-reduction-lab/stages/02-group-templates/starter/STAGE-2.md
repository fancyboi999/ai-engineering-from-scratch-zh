`group(&[Record])->Vec<Group>`；`Group{level,template,count,first,last,example}`。按 level/template 字典序返回组。源范围可能有间隙；不能据此声称中间每行都属于该组。

统计重复次数，不丢弃其源范围。
