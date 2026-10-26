(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-python.js"] = {
  "s0-list-vs-generator": {
    "text": {
      "LIST VS GENERATOR": "列表对比生成器",
      "Both loops read the same eight rows. The list version reads every row into memory before the first training step starts. The generator version holds one batch of two rows, and the first step starts when that batch is ready. For a real dataset, the list needs memory for the whole file, and the generator needs memory for one batch.": "两个循环读取相同的8行数据。列表版本在第一次训练步骤开始前，将所有行读入内存。生成器版本只保留一个含2行的批次，该批次就绪后即可开始第一步。对于真实数据集，列表需要容纳整个文件的内存，生成器只需要容纳一个批次的内存。",
      "dataset on disk, 8 rows": "磁盘上的数据集，共 8 行",
      "held in memory": "内存中保留",
      "8 of 8 rows held": "内存中保留 8 行，共 8 行",
      "step 1 waits for every row": "第 1 步等待全部行读完",
      "2 of 8 rows held": "内存中保留 2 行，共 8 行",
      "step 1 starts with batch 1": "第 1 步从批次 1 开始",
      "same rows, same batches, different memory": "相同的行，相同的批次，不同的内存占用"
    },
    "patterns": [
      [
        "^(\\d+) of (\\d+) rows held$",
        "内存中保留 $1 行，共 $2 行"
      ],
      [
        "^dataset on disk, (\\d+) rows$",
        "磁盘上的数据集，共 $1 行"
      ]
    ],
    "preserve": [
      {
        "text": "rows = list(read_rows(path))",
        "reason": "列表与生成器代码是可复制的演示实现，保留原样"
      },
      {
        "text": "for batch in batches(read_rows(path), 2):",
        "reason": "列表与生成器代码是可复制的演示实现，保留原样"
      }
    ]
  }
};
