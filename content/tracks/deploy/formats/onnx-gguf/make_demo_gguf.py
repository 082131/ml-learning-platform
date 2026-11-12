"""Write a tiny GGUF file (two tensors, three metadata keys) to read byte by byte in the lesson."""
import numpy as np
from gguf import GGMLQuantizationType, GGUFWriter, quants

w = GGUFWriter("demo.gguf", "demo")              # also writes general.architecture = "demo"
w.add_name("tiny demo")
w.add_uint32("demo.block_count", 1)
w.add_tensor("norm.weight", np.array([1.0, 0.5, -0.25, 2.0], dtype=np.float32))
x = (np.arange(32, dtype=np.float32) - 16) / 100  # -0.16 .. 0.15
w.add_tensor("proj.weight", quants.quantize(x.reshape(1, 32), GGMLQuantizationType.Q8_0),
             raw_dtype=GGMLQuantizationType.Q8_0)
w.write_header_to_file()
w.write_kv_data_to_file()
w.write_tensors_to_file()
w.close()
